import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { whereInspeccionesVisibles } from "@/lib/inspecciones";

export const dynamic = "force-dynamic";

// Piezas y defectos que ESTE usuario capturó HOY en esta inspección
// (para el contador "Defectos del día" en la pantalla de captura).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    const visible = await prisma.inspeccion.findFirst({
      where: { id: params.id, ...whereInspeccionesVisibles(user) },
      select: { id: true },
    });
    if (!visible) throw new ErrorPermiso("Inspección no encontrada", 404);

    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const resumen = await prisma.captura.aggregate({
      where: { inspeccionId: params.id, usuarioId: user.id, creadoEn: { gte: inicioHoy } },
      _sum: { buenas: true, malas: true },
    });

    return Response.json({
      buenas: resumen._sum.buenas ?? 0,
      malas: resumen._sum.malas ?? 0,
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
