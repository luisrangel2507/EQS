import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const suscripcionSchema = z.object({
  endpoint: z.string().trim().min(1),
  keys: z.object({
    p256dh: z.string().trim().min(1),
    auth: z.string().trim().min(1),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requerirSesion();
    const body = await req.json();
    const datos = suscripcionSchema.parse(body);

    await prisma.suscripcionPush.upsert({
      where: { endpoint: datos.endpoint },
      update: { usuarioId: user.id, p256dh: datos.keys.p256dh, auth: datos.keys.auth },
      create: {
        usuarioId: user.id,
        endpoint: datos.endpoint,
        p256dh: datos.keys.p256dh,
        auth: datos.keys.auth,
      },
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}

const desuscribirSchema = z.object({ endpoint: z.string().trim().min(1) });

export async function DELETE(req: NextRequest) {
  try {
    const user = await requerirSesion();
    const body = await req.json();
    const datos = desuscribirSchema.parse(body);

    await prisma.suscripcionPush.deleteMany({
      where: { endpoint: datos.endpoint, usuarioId: user.id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
