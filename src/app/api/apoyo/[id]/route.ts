import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso, esLiderazgo } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Liderazgo marca una solicitud de apoyo como atendida.
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    if (!esLiderazgo(user.rol)) {
      throw new ErrorPermiso("No tienes acceso a las solicitudes de apoyo");
    }

    const solicitud = await prisma.solicitudApoyo.update({
      where: { id: params.id },
      data: { atendida: true, atendidaPorId: user.id, atendidaEn: new Date() },
    });

    return Response.json(solicitud);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
