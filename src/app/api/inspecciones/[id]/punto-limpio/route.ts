import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const puntoLimpioSchema = z
  .object({
    fotoUrl: z.string().trim().min(1).optional(),
    ok: z.literal(true).optional(),
  })
  .refine((d) => (d.fotoUrl ? !d.ok : Boolean(d.ok)), {
    message: "Manda una foto o confirma el punto limpio, no ambos a la vez",
  });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    if (user.rol !== "INSPECTOR") {
      throw new ErrorPermiso("Solo el rol Inspector puede reportar el Punto Limpio");
    }

    const inspeccion = await prisma.inspeccion.findFirst({
      where: { id: params.id, inspectores: { some: { usuarioId: user.id } } },
    });
    if (!inspeccion) throw new ErrorPermiso("Inspección no encontrada", 404);
    if (inspeccion.cerrado) throw new ErrorPermiso("La inspección está cerrada", 400);

    const body = await req.json();
    const datos = puntoLimpioSchema.parse(body);

    if (datos.fotoUrl) {
      const actualizada = await prisma.inspeccion.update({
        where: { id: params.id },
        data: {
          puntoLimpioFotoUrl: datos.fotoUrl,
          puntoLimpioReportadoPor: user.nombre,
          puntoLimpioReportadoEn: new Date(),
          puntoLimpioOk: false,
          puntoLimpioOkPor: null,
          puntoLimpioOkEn: null,
        },
      });
      return Response.json(actualizada);
    }

    if (!inspeccion.puntoLimpioFotoUrl) {
      throw new ErrorPermiso("Primero reporta la evidencia del Punto Limpio", 400);
    }
    const actualizada = await prisma.inspeccion.update({
      where: { id: params.id },
      data: {
        puntoLimpioOk: true,
        puntoLimpioOkPor: user.nombre,
        puntoLimpioOkEn: new Date(),
      },
    });
    return Response.json(actualizada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
