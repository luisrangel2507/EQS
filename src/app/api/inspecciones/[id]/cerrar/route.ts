import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const cerrarSchema = z.object({
  cerradoPor: z.string().trim().min(2, "Indica quién cierra la inspección"),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requerirRol("ADMIN", "SUPERVISOR");

    const inspeccion = await prisma.inspeccion.findUnique({ where: { id: params.id } });
    if (!inspeccion) throw new ErrorPermiso("Inspección no encontrada", 404);
    if (inspeccion.cerrado) throw new ErrorPermiso("La inspección ya está cerrada", 400);

    const body = await req.json();
    const { cerradoPor } = cerrarSchema.parse(body);

    const actualizada = await prisma.inspeccion.update({
      where: { id: params.id },
      data: { cerrado: true, cerradoPor, cerradoEn: new Date() },
    });

    return Response.json(actualizada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
