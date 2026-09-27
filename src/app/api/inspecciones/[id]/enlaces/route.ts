import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso, type SesionUsuario } from "@/lib/permissions";
import { obtenerInspeccionVisible } from "@/lib/inspecciones";

export const dynamic = "force-dynamic";

const crearSchema = z.object({ dias: z.number().int().min(1).max(365).nullable() });

async function validar(user: SesionUsuario, inspeccionId: string) {
  if (user.rol === "INSPECTOR" || user.rol === "RESIDENTE") {
    throw new ErrorPermiso("Tu rol no puede compartir inspecciones");
  }
  const inspeccion = await obtenerInspeccionVisible(user, inspeccionId);
  if (!inspeccion) throw new ErrorPermiso("Inspección no encontrada", 404);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    await validar(user, params.id);
    const enlaces = await prisma.enlaceCompartido.findMany({
      where: { inspeccionId: params.id, revocado: false },
      orderBy: { creadoEn: "desc" },
      include: { creadoPor: { select: { nombre: true } } },
    });
    return Response.json(enlaces);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    await validar(user, params.id);
    const { dias } = crearSchema.parse(await req.json());
    const enlace = await prisma.enlaceCompartido.create({
      data: {
        token: randomBytes(24).toString("base64url"),
        inspeccionId: params.id,
        creadoPorId: user.id,
        expiraEn: dias ? new Date(Date.now() + dias * 86400000) : null,
      },
    });
    return Response.json(enlace, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Vigencia inválida" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
