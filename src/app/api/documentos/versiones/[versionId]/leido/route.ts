import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { puedeVerDocumentos } from "@/lib/documentos";

export const dynamic = "force-dynamic";

// evidencia de que el usuario leyó la versión vigente (capacitación en el cambio)
export async function POST(_req: NextRequest, { params }: { params: { versionId: string } }) {
  try {
    const user = await requerirSesion();
    if (!puedeVerDocumentos(user.rol)) throw new ErrorPermiso("Sin permiso");
    const v = await prisma.documentoVersion.findUnique({ where: { id: params.versionId } });
    if (!v || v.estado !== "vigente") throw new ErrorPermiso("Solo se confirma la lectura de la versión vigente", 400);
    await prisma.documentoLectura.upsert({
      where: { versionId_usuarioId: { versionId: v.id, usuarioId: user.id } },
      create: { versionId: v.id, usuarioId: user.id },
      update: {},
    });
    return Response.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
