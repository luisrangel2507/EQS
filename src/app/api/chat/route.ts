import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso, esLiderazgo } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const LIMITE_MENSAJES = 200;

const enviarMensajeSchema = z.object({
  contenido: z.string().trim().min(1, "Escribe un mensaje").max(2000, "Mensaje demasiado largo"),
});

// Chat grupal único para Admin, Supervisor y Líder.
export async function GET() {
  try {
    const user = await requerirSesion();
    if (!esLiderazgo(user.rol)) {
      throw new ErrorPermiso("No tienes acceso al chat de liderazgo");
    }

    const mensajes = await prisma.mensajeChat.findMany({
      orderBy: { creadoEn: "desc" },
      take: LIMITE_MENSAJES,
      include: { autor: { select: { id: true, nombre: true, rol: true } } },
    });

    return Response.json(mensajes.reverse());
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requerirSesion();
    if (!esLiderazgo(user.rol)) {
      throw new ErrorPermiso("No tienes acceso al chat de liderazgo");
    }

    const body = await req.json();
    const { contenido } = enviarMensajeSchema.parse(body);

    const mensaje = await prisma.mensajeChat.create({
      data: { contenido, autorId: user.id },
      include: { autor: { select: { id: true, nombre: true, rol: true } } },
    });

    return Response.json(mensaje, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
