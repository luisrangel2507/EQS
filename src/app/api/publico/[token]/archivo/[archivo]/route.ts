import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { enlaceVigente } from "@/lib/compartido";
import { respuestaArchivo } from "@/lib/uploads";

export const dynamic = "force-dynamic";

// Solo sirve archivos que sean evidencia de la inspección del enlace, no cualquier archivo subido.
export async function GET(_req: NextRequest, { params }: { params: { token: string; archivo: string } }) {
  const enlace = await enlaceVigente(params.token);
  if (!enlace) return new Response("Enlace no válido", { status: 404 });

  const url = `/api/archivos/${params.archivo}`;
  const pertenece =
    (await prisma.captura.count({ where: { inspeccionId: enlace.inspeccionId, fotoUrl: url } })) > 0 ||
    (await prisma.inspeccion.count({ where: { id: enlace.inspeccionId, puntoLimpioFotoUrl: url } })) > 0;
  if (!pertenece) return new Response("No encontrado", { status: 404 });

  const respuesta = await respuestaArchivo(params.archivo, "private, max-age=3600");
  return respuesta ?? new Response("No encontrado", { status: 404 });
}
