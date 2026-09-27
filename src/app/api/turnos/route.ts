import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";
import { turnoEn } from "@/lib/turnos";
import { resumenVentana } from "@/lib/turnosServidor";

export const dynamic = "force-dynamic";

const ROLES_TURNO = ["ADMIN", "SUPERVISOR", "GERENTE", "LIDER", "RESIDENTE"] as const;

const relevoSchema = z.object({
  planta: z.string().trim().optional().nullable(),
  novedades: z.string().trim().min(3, "Escribe qué pasó en el turno").max(4000),
  pendientes: z.string().trim().max(4000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requerirRol(...ROLES_TURNO);
    // el Residente solo ve su planta; los demás pueden filtrar
    const planta =
      user.rol === "RESIDENTE" ? user.plantaResidente : req.nextUrl.searchParams.get("planta") || null;

    const { turno, inicio, fin } = turnoEn();
    const resumen = await resumenVentana(inicio, new Date(), planta);

    const relevos = await prisma.relevoTurno.findMany({
      where: planta ? { planta } : {},
      orderBy: { creadoEn: "desc" },
      take: 30,
      include: {
        autor: { select: { id: true, nombre: true, rol: true } },
        recibidoPor: { select: { id: true, nombre: true } },
      },
    });

    return Response.json({
      turnoActual: { valor: turno.valor, inicio: inicio.toISOString(), fin: fin.toISOString() },
      planta,
      resumen,
      relevos,
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requerirRol(...ROLES_TURNO);
    const datos = relevoSchema.parse(await req.json());
    const planta = user.rol === "RESIDENTE" ? user.plantaResidente : datos.planta || null;

    const { turno, inicio, fin } = turnoEn();
    const resumen = await resumenVentana(inicio, new Date(), planta);

    const relevo = await prisma.relevoTurno.create({
      data: {
        autorId: user.id,
        turno: turno.valor,
        planta,
        inicioTurno: inicio,
        finTurno: fin,
        piezasBuenas: resumen.buenas,
        piezasMalas: resumen.malas,
        novedades: datos.novedades,
        pendientes: datos.pendientes || null,
      },
    });
    return Response.json(relevo, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
