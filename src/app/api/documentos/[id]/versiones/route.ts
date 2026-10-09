import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { registrar } from "@/lib/bitacora";
import { puedeCrearDocumentos } from "@/lib/documentos";

export const dynamic = "force-dynamic";

const schema = z.object({
  archivoUrl: z.string().trim().startsWith("/api/archivos/", "Sube el PDF de la nueva versión"),
  cambios: z.string().trim().min(5, "Describe qué cambió en esta versión").max(1000),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    if (!puedeCrearDocumentos(user.rol)) throw new ErrorPermiso("Solo Admin o Supervisor pueden subir versiones");
    const d = schema.parse(await req.json());
    const doc = await prisma.documento.findUnique({ where: { id: params.id }, include: { versiones: { select: { version: true, estado: true } } } });
    if (!doc) throw new ErrorPermiso("Documento no encontrado", 404);
    if (doc.versiones.some((v) => v.estado === "en_revision")) {
      throw new ErrorPermiso("Ya hay una versión en revisión; apruébala o recházala primero", 400);
    }
    const numero = Math.max(0, ...doc.versiones.map((v) => v.version)) + 1;
    const version = await prisma.documentoVersion.create({
      data: { documentoId: doc.id, version: numero, archivoUrl: d.archivoUrl, cambios: d.cambios, creadoPorId: user.id },
    });
    await registrar(user, {
      accion: "EDITAR",
      entidad: "Documento",
      entidadId: doc.id,
      resumen: `Subió la versión ${numero} de ${doc.codigo} (en revisión)`,
      despues: { version: numero, cambios: d.cambios },
    });
    return Response.json(version, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
