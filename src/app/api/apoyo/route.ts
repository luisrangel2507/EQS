import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso, esLiderazgo } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const solicitarSchema = z.object({
  inspeccionId: z.string().optional().nullable(),
});

// El piso (Inspector, Líder, Supervisor, Admin) llama apoyo; lo ve liderazgo en el Dashboard.
export async function POST(req: NextRequest) {
  try {
    const user = await requerirSesion();
    if (user.rol === "CLIENTE") {
      throw new ErrorPermiso("Los clientes no pueden solicitar apoyo");
    }

    const body = await req.json().catch(() => ({}));
    const { inspeccionId } = solicitarSchema.parse(body);

    const estado = await prisma.estadoInspector.findUnique({ where: { usuarioId: user.id } });

    const solicitud = await prisma.solicitudApoyo.create({
      data: {
        usuarioId: user.id,
        estacion: estado?.estacion ?? null,
        inspeccionId: inspeccionId || null,
      },
    });

    return Response.json(solicitud, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}

// Liderazgo ve las solicitudes pendientes (o las últimas atendidas recientes).
export async function GET() {
  try {
    const user = await requerirSesion();
    if (!esLiderazgo(user.rol)) {
      throw new ErrorPermiso("No tienes acceso a las solicitudes de apoyo");
    }

    const solicitudes = await prisma.solicitudApoyo.findMany({
      where: { atendida: false },
      orderBy: { creadoEn: "asc" },
      include: {
        usuario: { select: { id: true, nombre: true } },
        inspeccion: { select: { id: true, nombre: true, numeroParte: true } },
      },
    });

    return Response.json(solicitudes);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
