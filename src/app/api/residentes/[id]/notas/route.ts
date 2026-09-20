import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, esLiderazgo, ErrorPermiso } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const notaSchema = z.object({
  contenido: z.string().trim().min(1, "Escribe una nota").max(2000),
});

// Bitácora de seguimiento de un Residente: notas que deja liderazgo.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    if (!esLiderazgo(user.rol)) {
      throw new ErrorPermiso("No tienes acceso al seguimiento de residentes");
    }

    const notas = await prisma.notaResidente.findMany({
      where: { residenteId: params.id },
      orderBy: { creadoEn: "desc" },
      include: { autor: { select: { nombre: true, rol: true } } },
    });

    return Response.json(notas);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    if (!esLiderazgo(user.rol)) {
      throw new ErrorPermiso("No tienes acceso al seguimiento de residentes");
    }

    const residente = await prisma.usuario.findFirst({
      where: { id: params.id, esResidente: true },
    });
    if (!residente) throw new ErrorPermiso("Residente no encontrado", 404);

    const body = await req.json();
    const datos = notaSchema.parse(body);

    const nota = await prisma.notaResidente.create({
      data: { residenteId: params.id, autorId: user.id, contenido: datos.contenido },
      include: { autor: { select: { nombre: true, rol: true } } },
    });

    return Response.json(nota, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
