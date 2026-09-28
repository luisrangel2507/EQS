import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { PLANTAS } from "@/lib/constants";
import { itemsDe } from "@/lib/auditorias";
import { whereAuditoriasVisibles } from "@/lib/auditoriasServidor";

export const dynamic = "force-dynamic";

const nuevaSchema = z.object({
  plantillaId: z.string().min(1),
  planta: z.enum(PLANTAS).optional().nullable(),
  cliente: z.string().trim().optional().nullable(),
  area: z.string().trim().max(200).optional().nullable(),
});

export async function GET() {
  try {
    const user = await requerirSesion();
    const auditorias = await prisma.auditoria.findMany({
      where: whereAuditoriasVisibles(user),
      orderBy: { creadoEn: "desc" },
      take: 200,
      select: {
        id: true,
        folio: true,
        nombrePlantilla: true,
        tipo: true,
        planta: true,
        cliente: true,
        area: true,
        puntaje: true,
        hallazgos: true,
        estado: true,
        creadoEn: true,
        completadaEn: true,
        auditor: { select: { nombre: true } },
      },
    });
    return Response.json(auditorias);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requerirRol("ADMIN", "SUPERVISOR", "GERENTE", "LIDER", "RESIDENTE");
    const datos = nuevaSchema.parse(await req.json());
    const plantilla = await prisma.plantillaChecklist.findUnique({ where: { id: datos.plantillaId } });
    if (!plantilla || !plantilla.activa) throw new ErrorPermiso("Plantilla no disponible", 404);
    const items = itemsDe(plantilla.items);
    const auditoria = await prisma.auditoria.create({
      data: {
        plantillaId: plantilla.id,
        nombrePlantilla: plantilla.nombre,
        tipo: plantilla.tipo,
        items,
        respuestas: items.map(() => ({ resultado: null, comentario: null, fotoUrl: null })),
        planta: user.rol === "RESIDENTE" ? user.plantaResidente : datos.planta || null,
        cliente: datos.cliente || null,
        area: datos.area || null,
        auditorId: user.id,
      },
    });
    return Response.json(auditoria, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
