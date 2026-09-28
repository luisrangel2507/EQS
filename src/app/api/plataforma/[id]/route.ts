import { NextRequest } from "next/server";
import { z } from "zod";
import { prismaGlobal } from "@/lib/prisma";
import { requerirSuperadmin, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const schema = z.object({
  nombre: z.string().trim().min(2).max(120).optional(),
  nombreCorto: z.string().trim().min(2).max(30).optional(),
  activa: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSuperadmin();
    const datos = schema.parse(await req.json());
    if (datos.activa === false && params.id === user.organizacionId) {
      throw new ErrorPermiso("No puedes suspender tu propia organización", 400);
    }
    const org = await prismaGlobal.organizacion.update({ where: { id: params.id }, data: datos });
    return Response.json(org);
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
