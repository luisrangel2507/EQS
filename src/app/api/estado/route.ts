import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { ESTADOS_INSPECTOR, ESTACIONES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const VALORES = ESTADOS_INSPECTOR.map((e) => e.valor);

const estadoSchema = z.object({
  estado: z.enum(VALORES as [string, ...string[]]).optional(),
  estacion: z.enum(ESTACIONES).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requerirSesion();
    if (user.rol === "CLIENTE") {
      throw new ErrorPermiso("Los clientes no tienen estado de inspector");
    }

    const body = await req.json();
    const { estado, estacion } = estadoSchema.parse(body);
    if (!estado && !estacion) {
      throw new ErrorPermiso("Nada que actualizar", 400);
    }

    const registro = await prisma.estadoInspector.upsert({
      where: { usuarioId: user.id },
      create: { usuarioId: user.id, estado: estado ?? "activo", estacion },
      update: {
        ...(estado ? { estado, desde: new Date() } : {}),
        ...(estacion ? { estacion } : {}),
      },
    });

    return Response.json(registro);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}

export async function GET() {
  try {
    const user = await requerirSesion();
    const registro = await prisma.estadoInspector.findUnique({ where: { usuarioId: user.id } });
    return Response.json(registro);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
