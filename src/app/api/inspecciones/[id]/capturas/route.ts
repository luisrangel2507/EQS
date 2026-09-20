import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { whereInspeccionesVisibles } from "@/lib/inspecciones";

export const dynamic = "force-dynamic";

const capturaSchema = z
  .object({
    tipo: z.enum(["buena", "mala"]),
    cantidad: z.coerce.number().int().min(1).max(999).optional().default(1),
    defecto: z.string().trim().optional().nullable(),
    fotoUrl: z.string().trim().optional().nullable(),
  })
  .refine((d) => d.tipo !== "mala" || Boolean(d.defecto), {
    message: "Selecciona el tipo de defecto",
    path: ["defecto"],
  });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();

    if (user.rol === "CLIENTE") {
      throw new ErrorPermiso("Los clientes no pueden capturar inspecciones");
    }

    const inspeccion = await prisma.inspeccion.findFirst({
      where: { id: params.id, ...whereInspeccionesVisibles(user) },
    });
    if (!inspeccion) throw new ErrorPermiso("Inspección no encontrada", 404);
    if (inspeccion.cerrado) throw new ErrorPermiso("La inspección está cerrada", 400);

    const body = await req.json();
    const datos = capturaSchema.parse(body);
    const esBuena = datos.tipo === "buena";
    const cantidad = datos.cantidad;

    const [captura] = await prisma.$transaction([
      prisma.captura.create({
        data: {
          inspeccionId: params.id,
          usuarioId: user.id,
          buenas: esBuena ? cantidad : 0,
          malas: esBuena ? 0 : cantidad,
          defecto: esBuena ? null : datos.defecto,
          fotoUrl: datos.fotoUrl || null,
        },
      }),
      prisma.inspeccion.update({
        where: { id: params.id },
        data: esBuena
          ? { piezasBuenas: { increment: cantidad } }
          : { piezasMalas: { increment: cantidad } },
      }),
      ...(!esBuena && datos.defecto
        ? [
            prisma.defectoResumen.upsert({
              where: { inspeccionId_tipo: { inspeccionId: params.id, tipo: datos.defecto } },
              create: { inspeccionId: params.id, tipo: datos.defecto, cantidad },
              update: { cantidad: { increment: cantidad } },
            }),
          ]
        : []),
    ]);

    return Response.json(captura, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
