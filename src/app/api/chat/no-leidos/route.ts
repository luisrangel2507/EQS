import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, puedeChatear, ErrorPermiso } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Cuenta mensajes de otros después de `desde` (marca de última lectura guardada
// en el navegador del usuario) para el badge de la burbuja flotante de chat.
export async function GET(req: NextRequest) {
  try {
    const user = await requerirSesion();
    if (!puedeChatear(user.rol)) {
      throw new ErrorPermiso("No tienes acceso al chat");
    }

    const desde = req.nextUrl.searchParams.get("desde");
    if (!desde) {
      return Response.json({ noLeidos: 0 });
    }

    const fecha = new Date(desde);
    if (Number.isNaN(fecha.getTime())) {
      return Response.json({ noLeidos: 0 });
    }

    const noLeidos = await prisma.mensajeChat.count({
      where: { creadoEn: { gt: fecha }, autorId: { not: user.id } },
    });

    return Response.json({ noLeidos });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
