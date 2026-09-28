import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";
import { PLANTILLAS_EJEMPLO } from "@/lib/auditorias";

export const dynamic = "force-dynamic";

const plantillaSchema = z.object({
  nombre: z.string().trim().min(3, "Ponle nombre a la plantilla"),
  tipo: z.enum(["capas", "5s", "recibo", "producto", "otro"]),
  descripcion: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(z.object({ texto: z.string().trim().min(3, "Cada punto necesita texto"), requiereFoto: z.boolean() }))
    .min(1, "Agrega al menos un punto")
    .max(60),
});

export async function GET() {
  try {
    await requerirRol("ADMIN", "SUPERVISOR", "GERENTE", "LIDER", "RESIDENTE");
    const plantillas = await prisma.plantillaChecklist.findMany({
      orderBy: [{ activa: "desc" }, { nombre: "asc" }],
      include: { _count: { select: { auditorias: true } } },
    });
    return Response.json(plantillas);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requerirRol("ADMIN", "SUPERVISOR");
    const body = await req.json();
    if (body?.ejemplos) {
      await prisma.plantillaChecklist.createMany({ data: PLANTILLAS_EJEMPLO.map((p) => ({ ...p, creadoPorId: user.id })) });
      return Response.json({ ok: true }, { status: 201 });
    }
    const datos = plantillaSchema.parse(body);
    const plantilla = await prisma.plantillaChecklist.create({ data: { ...datos, creadoPorId: user.id } });
    return Response.json(plantilla, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
