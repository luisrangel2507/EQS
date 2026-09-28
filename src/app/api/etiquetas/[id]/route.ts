import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso, esLiderazgo } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const anularSchema = z.object({ motivo: z.string().trim().min(3).max(300) });

// Anular una etiqueta: el QR sigue abriendo, pero avisa en rojo que ese contenedor no debe usarse.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    if (!esLiderazgo(user.rol)) throw new ErrorPermiso("Solo liderazgo puede anular etiquetas");
    const { motivo } = anularSchema.parse(await req.json());
    const etiqueta = await prisma.etiquetaLiberacion.findUnique({ where: { id: params.id } });
    if (!etiqueta) throw new ErrorPermiso("Etiqueta no encontrada", 404);
    if (etiqueta.anulada) throw new ErrorPermiso("La etiqueta ya estaba anulada", 400);
    const actualizada = await prisma.etiquetaLiberacion.update({
      where: { id: params.id },
      data: { anulada: true, anuladaEn: new Date(), motivoAnulacion: motivo },
    });
    return Response.json(actualizada);
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Escribe el motivo de la anulación" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
