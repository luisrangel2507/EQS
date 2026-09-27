import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { DISCIPLINAS, avance8D } from "@/lib/ochoD";
import { exigirEdicion, obtener8DVisible } from "@/lib/ochoDServidor";

export const dynamic = "force-dynamic";

const texto = z.string().max(8000).nullable().optional();
const cambiosSchema = z.object({
  d1Equipo: texto,
  d2Problema: texto,
  d3Contencion: texto,
  d4CausaRaiz: texto,
  d5Acciones: texto,
  d6Implementacion: texto,
  d7Prevencion: texto,
  d8Cierre: texto,
  estado: z.enum(["abierto", "cerrado"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, reporte } = await obtener8DVisible(params.id);
    return Response.json({ ...reporte, puedeEditar: ["ADMIN", "SUPERVISOR", "GERENTE", "LIDER"].includes(user.rol) });
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, reporte } = await obtener8DVisible(params.id);
    exigirEdicion(user);
    const cambios = cambiosSchema.parse(await req.json());

    if (reporte.estado === "cerrado" && cambios.estado !== "abierto") {
      throw new ErrorPermiso("El 8D está cerrado; reábrelo para editarlo", 400);
    }
    if (cambios.estado === "cerrado" && avance8D({ ...reporte, ...cambios }) < DISCIPLINAS.length) {
      throw new ErrorPermiso("Completa las 8 disciplinas antes de cerrar el 8D", 400);
    }

    const actualizado = await prisma.reporte8D.update({
      where: { id: params.id },
      data: {
        ...cambios,
        ...(cambios.estado === "cerrado" ? { cerradoEn: new Date() } : {}),
        ...(cambios.estado === "abierto" ? { cerradoEn: null } : {}),
      },
    });
    return Response.json(actualizado);
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await obtener8DVisible(params.id);
    if (user.rol !== "ADMIN" && user.rol !== "SUPERVISOR") throw new ErrorPermiso("Solo Admin o Supervisor");
    await prisma.reporte8D.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
