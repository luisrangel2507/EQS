import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requerirSesion();
    const [notificaciones, noLeidas] = await Promise.all([
      prisma.notificacion.findMany({
        where: { usuarioId: user.id },
        orderBy: { creadoEn: "desc" },
        take: 20,
        include: {
          inspeccion: { select: { id: true, nombre: true, numeroParte: true } },
        },
      }),
      prisma.notificacion.count({ where: { usuarioId: user.id, leida: false } }),
    ]);
    return Response.json({ notificaciones, noLeidas });
  } catch (error) {
    return manejarErrorApi(error);
  }
}

// Marca como leídas todas las notificaciones del usuario actual
export async function PATCH() {
  try {
    const user = await requerirSesion();
    await prisma.notificacion.updateMany({
      where: { usuarioId: user.id, leida: false },
      data: { leida: true },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
