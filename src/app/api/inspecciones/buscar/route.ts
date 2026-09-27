import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { whereInspeccionesVisibles } from "@/lib/inspecciones";

export const dynamic = "force-dynamic";

// Resuelve lo que se lea con la cámara: la URL de una etiqueta QR propia, un id,
// el número de parte impreso en la pieza o el lote de Punto Limpio.
export async function GET(req: NextRequest) {
  try {
    const user = await requerirSesion();
    const codigo = req.nextUrl.searchParams.get("codigo")?.trim();
    if (!codigo) throw new ErrorPermiso("Falta el código", 400);

    const visibles = whereInspeccionesVisibles(user);
    const idEnUrl = codigo.match(/inspecciones\/([a-z0-9]{20,})/i)?.[1];
    const candidatoId = idEnUrl ?? (/^[a-z0-9]{20,}$/i.test(codigo) ? codigo : null);

    if (candidatoId) {
      const porId = await prisma.inspeccion.findFirst({
        where: { id: candidatoId, ...visibles },
        select: { id: true },
      });
      if (porId) return Response.json({ id: porId.id });
    }

    const coincidencias = await prisma.inspeccion.findMany({
      where: {
        ...visibles,
        OR: [
          { numeroParte: { equals: codigo, mode: "insensitive" } },
          { puntoLimpio: { equals: codigo, mode: "insensitive" } },
        ],
      },
      orderBy: [{ cerrado: "asc" }, { creadoEn: "desc" }],
      select: { id: true, nombre: true, numeroParte: true, cliente: true, cerrado: true },
      take: 10,
    });

    if (coincidencias.length === 0) {
      throw new ErrorPermiso(`No encontré ninguna inspección para "${codigo}"`, 404);
    }
    const abiertas = coincidencias.filter((c) => !c.cerrado);
    if (abiertas.length === 1 || coincidencias.length === 1) {
      return Response.json({ id: (abiertas[0] ?? coincidencias[0]).id });
    }
    return Response.json({ opciones: coincidencias });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
