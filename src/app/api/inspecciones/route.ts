import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrar } from "@/lib/bitacora";
import { requerirRol, requerirSesion, manejarErrorApi } from "@/lib/permissions";
import { whereInspeccionesVisibles } from "@/lib/inspecciones";
import { validarAsignacion } from "@/lib/certificaciones";

export const dynamic = "force-dynamic";

const crearInspeccionSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es requerido"),
  numeroParte: z.string().trim().optional().nullable(),
  cliente: z.string().trim().optional().nullable(),
  planta: z.string().trim().optional().nullable(),
  puntoLimpio: z.string().trim().optional().nullable(),
  meta: z.coerce.number().int().min(0).optional(),
  precioPorPieza: z.coerce.number().min(0).optional(),
  modoCobro: z.enum(["pieza", "hora"]).optional(),
  precioPorHora: z.coerce.number().min(0).optional(),
  fechaEntrega: z.string().datetime().optional().nullable().or(z.literal("").transform(() => null)),
  instrucciones: z.string().trim().optional().nullable(),
  instruccionesPdfUrl: z.string().trim().optional().nullable(),
  inspectorIds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const user = await requerirSesion();
    const inspecciones = await prisma.inspeccion.findMany({
      where: whereInspeccionesVisibles(user),
      orderBy: { creadoEn: "desc" },
      include: {
        inspectores: { include: { usuario: { select: { id: true, nombre: true } } } },
      },
    });
    return Response.json(inspecciones);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requerirRol("ADMIN", "SUPERVISOR");
    const body = await req.json();
    const datos = crearInspeccionSchema.parse(body);
    await validarAsignacion(datos.inspectorIds, datos.numeroParte);

    const inspeccion = await prisma.inspeccion.create({
      data: {
        organizacionId: user.organizacionId,
        nombre: datos.nombre,
        numeroParte: datos.numeroParte || null,
        cliente: datos.cliente || null,
        planta: datos.planta || null,
        puntoLimpio: datos.puntoLimpio || null,
        meta: datos.meta ?? 0,
        precioPorPieza: datos.precioPorPieza ?? 0,
        modoCobro: datos.modoCobro ?? "pieza",
        precioPorHora: datos.precioPorHora ?? 0,
        fechaEntrega: datos.fechaEntrega ? new Date(datos.fechaEntrega) : null,
        instrucciones: datos.instrucciones || null,
        instruccionesPdfUrl: datos.instruccionesPdfUrl || null,
        inspectores: datos.inspectorIds?.length
          ? { create: datos.inspectorIds.map((usuarioId) => ({ usuarioId })) }
          : undefined,
      },
      include: {
        inspectores: { include: { usuario: { select: { id: true, nombre: true } } } },
      },
    });

    await registrar(user, {
      accion: "CREAR",
      entidad: "Inspeccion",
      entidadId: inspeccion.id,
      resumen: `Creó la inspección «${inspeccion.nombre}»`,
      despues: { nombre: inspeccion.nombre, numeroParte: inspeccion.numeroParte, cliente: inspeccion.cliente, planta: inspeccion.planta, meta: inspeccion.meta },
    });

    return Response.json(inspeccion, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
