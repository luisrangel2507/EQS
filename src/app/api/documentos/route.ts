import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { registrar } from "@/lib/bitacora";
import { TIPOS_DOCUMENTO, puedeCrearDocumentos, puedeVerDocumentos, verBorradores } from "@/lib/documentos";

export const dynamic = "force-dynamic";

const crearSchema = z.object({
  codigo: z.string().trim().min(2).max(40),
  titulo: z.string().trim().min(3).max(200),
  tipo: z.enum(TIPOS_DOCUMENTO.map((t) => t[0]) as [string, ...string[]]),
  numeroParte: z.string().trim().max(60).optional().nullable(),
  descripcion: z.string().trim().max(1000).optional().nullable(),
  archivoUrl: z.string().trim().startsWith("/api/archivos/", "Sube el PDF del documento"),
  cambios: z.string().trim().max(1000).optional(),
});

export async function GET() {
  try {
    const user = await requerirSesion();
    if (!puedeVerDocumentos(user.rol)) throw new ErrorPermiso("Sin permiso");
    const docs = await prisma.documento.findMany({
      orderBy: [{ codigo: "asc" }],
      include: {
        versiones: {
          where: { estado: { in: ["vigente", "en_revision"] } },
          orderBy: { version: "desc" },
          include: { lecturas: { where: { usuarioId: user.id }, select: { id: true } } },
        },
      },
    });
    const filas = docs
      .map((d) => {
        const vigente = d.versiones.find((v) => v.estado === "vigente") ?? null;
        const pendiente = d.versiones.find((v) => v.estado === "en_revision") ?? null;
        return {
          id: d.id,
          codigo: d.codigo,
          titulo: d.titulo,
          tipo: d.tipo,
          numeroParte: d.numeroParte,
          vigente: vigente && {
            id: vigente.id,
            version: vigente.version,
            archivoUrl: vigente.archivoUrl,
            vigenteDesde: vigente.vigenteDesde,
            leido: vigente.lecturas.length > 0,
          },
          pendiente: verBorradores(user.rol) && pendiente ? { id: pendiente.id, version: pendiente.version } : null,
        };
      })
      .filter((d) => d.vigente || d.pendiente);
    return Response.json(filas);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requerirSesion();
    if (!puedeCrearDocumentos(user.rol)) throw new ErrorPermiso("Solo Admin o Supervisor pueden dar de alta documentos");
    const d = crearSchema.parse(await req.json());
    const existente = await prisma.documento.findFirst({ where: { codigo: d.codigo } });
    if (existente) throw new ErrorPermiso("Ya existe un documento con ese código", 409);
    const doc = await prisma.documento.create({
      data: {
        organizacionId: user.organizacionId,
        codigo: d.codigo,
        titulo: d.titulo,
        tipo: d.tipo,
        numeroParte: d.numeroParte || null,
        descripcion: d.descripcion || null,
        creadoPorId: user.id,
        versiones: {
          create: { version: 1, archivoUrl: d.archivoUrl, cambios: d.cambios || "Emisión inicial", creadoPorId: user.id },
        },
      },
    });
    await registrar(user, {
      accion: "CREAR",
      entidad: "Documento",
      entidadId: doc.id,
      resumen: `Dio de alta el documento ${doc.codigo} «${doc.titulo}» (versión 1, en revisión)`,
      despues: { codigo: doc.codigo, titulo: doc.titulo, tipo: doc.tipo, numeroParte: doc.numeroParte },
    });
    return Response.json(doc, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
