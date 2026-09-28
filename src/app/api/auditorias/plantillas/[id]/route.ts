import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const cambiosSchema = z.object({
  nombre: z.string().trim().min(3).optional(),
  tipo: z.enum(["capas", "5s", "recibo", "producto", "otro"]).optional(),
  descripcion: z.string().trim().max(1000).optional().nullable(),
  activa: z.boolean().optional(),
  items: z.array(z.object({ texto: z.string().trim().min(3), requiereFoto: z.boolean() })).min(1).max(60).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requerirRol("ADMIN", "SUPERVISOR");
    const datos = cambiosSchema.parse(await req.json());
    const plantilla = await prisma.plantillaChecklist.update({ where: { id: params.id }, data: datos });
    return Response.json(plantilla);
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
