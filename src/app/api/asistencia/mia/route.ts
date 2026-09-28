import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { horasEnRango, jornadaAbierta, marcarEntrada, marcarSalida } from "@/lib/asistencia";
import { inicioDiaLocal } from "@/lib/turnos";

export const dynamic = "force-dynamic";

async function estado(usuarioId: string) {
  const abierta = await jornadaAbierta(usuarioId);
  const inicioHoy = inicioDiaLocal();
  const hoy = await prisma.registroAsistencia.findMany({
    where: { usuarioId, OR: [{ salida: null }, { salida: { gte: inicioHoy } }] },
  });
  const horasHoy = hoy.reduce((acc, r) => acc + horasEnRango(r, inicioHoy, new Date(Date.now() + 1)), 0);
  return { abierta, horasHoy };
}

export async function GET() {
  try {
    const user = await requerirSesion();
    return Response.json(await estado(user.id));
  } catch (error) {
    return manejarErrorApi(error);
  }
}

const accionSchema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("entrar"), inspeccionId: z.string().min(1) }),
  z.object({ accion: z.literal("salir") }),
]);

export async function POST(req: NextRequest) {
  try {
    const user = await requerirSesion();
    if (user.rol !== "INSPECTOR" && user.rol !== "RESIDENTE") {
      throw new ErrorPermiso("Solo inspectores y residentes registran jornada");
    }
    const datos = accionSchema.parse(await req.json());
    if (datos.accion === "entrar") {
      const asignada = await prisma.inspeccion.findFirst({
        where: {
          id: datos.inspeccionId,
          cerrado: false,
          ...(user.rol === "INSPECTOR" ? { inspectores: { some: { usuarioId: user.id } } } : { planta: user.plantaResidente ?? "__nunca__" }),
        },
        select: { id: true },
      });
      if (!asignada) throw new ErrorPermiso("No estás asignado a esa inspección o ya está cerrada", 400);
      await marcarEntrada(user.id, datos.inspeccionId);
    } else {
      await marcarSalida(user.id);
    }
    return Response.json(await estado(user.id));
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
