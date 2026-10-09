import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { filaBitacora } from "@/lib/bitacora";
import { puedeAprobarDocumentos } from "@/lib/documentos";

export const dynamic = "force-dynamic";

const schema = z.object({
  accion: z.enum(["aprobar", "rechazar", "retirar"]),
  motivo: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { versionId: string } }) {
  try {
    const user = await requerirSesion();
    if (!puedeAprobarDocumentos(user.rol)) throw new ErrorPermiso("Solo Admin, Supervisor o Gerente pueden aprobar documentos");
    const d = schema.parse(await req.json());
    const v = await prisma.documentoVersion.findUnique({ where: { id: params.versionId }, include: { documento: true } });
    if (!v) throw new ErrorPermiso("Versión no encontrada", 404);
    const ahora = new Date();
    const etiqueta = `${v.documento.codigo} v${v.version}`;

    if (d.accion === "retirar") {
      if (v.estado !== "vigente") throw new ErrorPermiso("Solo se puede retirar la versión vigente", 400);
      if (!d.motivo || d.motivo.length < 5) throw new ErrorPermiso("Escribe el motivo del retiro", 400);
      await prisma.$transaction([
        prisma.documentoVersion.update({ where: { id: v.id }, data: { estado: "obsoleta", obsoletaEn: ahora, motivoDecision: d.motivo } }),
        filaBitacora(user, { accion: "RETIRAR", entidad: "Documento", entidadId: v.documentoId, resumen: `Retiró ${etiqueta} (queda obsoleto)`, motivo: d.motivo }),
      ]);
      return Response.json({ ok: true });
    }

    if (v.estado !== "en_revision") throw new ErrorPermiso("Esta versión ya fue revisada", 400);

    if (d.accion === "rechazar") {
      if (!d.motivo || d.motivo.length < 5) throw new ErrorPermiso("Escribe el motivo del rechazo", 400);
      await prisma.$transaction([
        prisma.documentoVersion.update({ where: { id: v.id }, data: { estado: "rechazada", revisadoPorId: user.id, revisadoEn: ahora, motivoDecision: d.motivo } }),
        filaBitacora(user, { accion: "RECHAZAR", entidad: "Documento", entidadId: v.documentoId, resumen: `Rechazó ${etiqueta}`, motivo: d.motivo }),
      ]);
      return Response.json({ ok: true });
    }

    // aprobar: debe hacerlo una persona distinta a quien lo elaboró (salvo que sea la única que puede aprobar)
    if (v.creadoPorId === user.id) {
      const aprobadores = await prisma.usuario.count({ where: { activo: true, rol: { in: ["ADMIN", "SUPERVISOR", "GERENTE"] } } });
      if (aprobadores > 1) throw new ErrorPermiso("La aprobación debe hacerla otra persona distinta a quien subió el documento", 400);
    }
    await prisma.$transaction([
      prisma.documentoVersion.updateMany({
        where: { documentoId: v.documentoId, estado: "vigente" },
        data: { estado: "obsoleta", obsoletaEn: ahora },
      }),
      prisma.documentoVersion.update({
        where: { id: v.id },
        data: { estado: "vigente", revisadoPorId: user.id, revisadoEn: ahora, vigenteDesde: ahora, motivoDecision: d.motivo || null },
      }),
      filaBitacora(user, {
        accion: "APROBAR",
        entidad: "Documento",
        entidadId: v.documentoId,
        resumen: `Aprobó ${etiqueta}; es la versión vigente`,
        despues: { version: v.version, elaboro: v.creadoPorId },
        motivo: d.motivo || null,
      }),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
