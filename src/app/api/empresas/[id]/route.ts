import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const actualizarEmpresaSchema = z.object({
  activa: z.boolean(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requerirRol("ADMIN");
    const body = await req.json();
    const datos = actualizarEmpresaSchema.parse(body);

    const empresa = await prisma.empresa.update({
      where: { id: params.id },
      data: { activa: datos.activa },
    });
    return Response.json(empresa);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
