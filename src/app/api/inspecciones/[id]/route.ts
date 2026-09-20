import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { obtenerInspeccionVisible } from "@/lib/inspecciones";

export const dynamic = "force-dynamic";

const actualizarInspeccionSchema = z.object({
  nombre: z.string().trim().min(2).optional(),
  numeroParte: z.string().trim().optional().nullable(),
  cliente: z.string().trim().optional().nullable(),
  planta: z.string().trim().optional().nullable(),
  meta: z.coerce.number().int().min(0).optional(),
  precioPorPieza: z.coerce.number().min(0).optional(),
  fechaEntrega: z.string().datetime().optional().nullable().or(z.literal("").transform(() => null)),
  instrucciones: z.string().trim().optional().nullable(),
  instruccionesPdfUrl: z.string().trim().optional().nullable(),
  inspectorIds: z.array(z.string()).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    const inspeccion = await obtenerInspeccionVisible(user, params.id);
    if (!inspeccion) throw new ErrorPermiso("Inspección no encontrada", 404);
    return Response.json(inspeccion);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requerirRol("ADMIN", "SUPERVISOR");
    const existente = await prisma.inspeccion.findUnique({ where: { id: params.id } });
    if (!existente) throw new ErrorPermiso("Inspección no encontrada", 404);
    if (existente.cerrado) throw new ErrorPermiso("La inspección está cerrada y no se puede editar", 400);

    const body = await req.json();
    const datos = actualizarInspeccionSchema.parse(body);

    const data: Record<string, unknown> = {};
    if (datos.nombre !== undefined) data.nombre = datos.nombre;
    if (datos.numeroParte !== undefined) data.numeroParte = datos.numeroParte || null;
    if (datos.cliente !== undefined) data.cliente = datos.cliente || null;
    if (datos.planta !== undefined) data.planta = datos.planta || null;
    if (datos.meta !== undefined) data.meta = datos.meta;
    if (datos.precioPorPieza !== undefined) data.precioPorPieza = datos.precioPorPieza;
    if (datos.fechaEntrega !== undefined) {
      data.fechaEntrega = datos.fechaEntrega ? new Date(datos.fechaEntrega) : null;
    }
    if (datos.instrucciones !== undefined) data.instrucciones = datos.instrucciones || null;
    if (datos.instruccionesPdfUrl !== undefined) {
      data.instruccionesPdfUrl = datos.instruccionesPdfUrl || null;
    }

    if (datos.inspectorIds !== undefined) {
      await prisma.inspeccionInspector.deleteMany({ where: { inspeccionId: params.id } });
      if (datos.inspectorIds.length) {
        await prisma.inspeccionInspector.createMany({
          data: datos.inspectorIds.map((usuarioId) => ({ inspeccionId: params.id, usuarioId })),
        });
      }
    }

    const inspeccion = await prisma.inspeccion.update({
      where: { id: params.id },
      data,
      include: {
        inspectores: { include: { usuario: { select: { id: true, nombre: true } } } },
      },
    });

    return Response.json(inspeccion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requerirRol("ADMIN", "SUPERVISOR");
    await prisma.inspeccion.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
