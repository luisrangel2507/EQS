import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { obtenerInspeccionVisible } from "@/lib/inspecciones";
import { borrador8D, exigirEdicion } from "@/lib/ochoDServidor";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    if (!(await obtenerInspeccionVisible(user, params.id))) throw new ErrorPermiso("Inspección no encontrada", 404);
    const reportes = await prisma.reporte8D.findMany({
      where: { inspeccionId: params.id },
      orderBy: { creadoEn: "desc" },
      include: { creadoPor: { select: { nombre: true } } },
    });
    return Response.json(reportes);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    exigirEdicion(user);
    if (!(await obtenerInspeccionVisible(user, params.id))) throw new ErrorPermiso("Inspección no encontrada", 404);
    const { defecto } = z.object({ defecto: z.string().trim().nullable() }).parse(await req.json());

    const reporte = await prisma.reporte8D.create({
      data: {
        inspeccionId: params.id,
        defecto: defecto || null,
        creadoPorId: user.id,
        ...(await borrador8D(params.id, defecto || null, user.nombre)),
      },
    });
    return Response.json(reporte, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
