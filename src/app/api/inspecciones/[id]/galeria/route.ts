import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { obtenerInspeccionVisible } from "@/lib/inspecciones";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    const inspeccion = await obtenerInspeccionVisible(user, params.id);
    if (!inspeccion) throw new ErrorPermiso("Inspección no encontrada", 404);

    const fotos = await prisma.captura.findMany({
      where: { inspeccionId: params.id, fotoUrl: { not: null } },
      orderBy: { creadoEn: "desc" },
      take: 120,
      select: {
        id: true,
        fotoUrl: true,
        defecto: true,
        malas: true,
        creadoEn: true,
        // el cliente ve la evidencia, no quién de nuestro personal la tomó
        usuario: user.rol === "CLIENTE" ? false : { select: { nombre: true } },
      },
    });
    return Response.json(fotos);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
