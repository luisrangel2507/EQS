import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const crearEmpresaSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre de la empresa es requerido"),
});

export async function GET() {
  try {
    await requerirSesion();
    const empresas = await prisma.empresa.findMany({ orderBy: { nombre: "asc" } });
    return Response.json(empresas);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requerirRol("ADMIN");
    const body = await req.json();
    const datos = crearEmpresaSchema.parse(body);

    const existente = await prisma.empresa.findUnique({ where: { nombre: datos.nombre } });
    if (existente) {
      throw new ErrorPermiso("Ya existe una empresa con ese nombre", 409);
    }

    const empresa = await prisma.empresa.create({ data: { nombre: datos.nombre } });
    return Response.json(empresa, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
