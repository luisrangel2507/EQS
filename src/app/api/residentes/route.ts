import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, esLiderazgo, ErrorPermiso } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Personal de EQS asignado de forma fija a la planta de un cliente (Residentes),
// con su estado en vivo, para que liderazgo les dé seguimiento.
export async function GET() {
  try {
    const user = await requerirSesion();
    if (!esLiderazgo(user.rol)) {
      throw new ErrorPermiso("No tienes acceso al seguimiento de residentes");
    }

    const residentes = await prisma.usuario.findMany({
      where: { rol: "RESIDENTE", activo: true },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        rol: true,
        plantaResidente: true,
        estado: { select: { estado: true, desde: true } },
        _count: { select: { notasResidente: true } },
      },
    });

    return Response.json(residentes);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
