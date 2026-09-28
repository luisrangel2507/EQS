import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso, esLiderazgo } from "@/lib/permissions";
import { calcularPuntaje, itemsDe, respuestasDe } from "@/lib/auditorias";
import { whereAuditoriasVisibles } from "@/lib/auditoriasServidor";
import { idsPorRol, notificar } from "@/lib/notificar";

export const dynamic = "force-dynamic";

async function visible(id: string) {
  const user = await requerirSesion();
  const auditoria = await prisma.auditoria.findFirst({
    where: { id, ...whereAuditoriasVisibles(user) },
    include: { auditor: { select: { id: true, nombre: true } } },
  });
  if (!auditoria) throw new ErrorPermiso("Auditoría no encontrada", 404);
  return { user, auditoria };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, auditoria } = await visible(params.id);
    return Response.json({
      ...auditoria,
      puedeEditar: auditoria.estado === "borrador" && (auditoria.auditorId === user.id || esLiderazgo(user.rol)),
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}

const accionSchema = z.discriminatedUnion("accion", [
  z.object({
    accion: z.literal("responder"),
    indice: z.number().int().min(0),
    resultado: z.enum(["ok", "no", "na"]),
    comentario: z.string().trim().max(2000).optional().nullable(),
    fotoUrl: z.string().trim().optional().nullable(),
  }),
  z.object({ accion: z.literal("finalizar") }),
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, auditoria } = await visible(params.id);
    if (auditoria.estado !== "borrador") throw new ErrorPermiso("La auditoría ya está completada", 400);
    if (auditoria.auditorId !== user.id && !esLiderazgo(user.rol)) throw new ErrorPermiso("Solo el auditor puede capturarla");
    const datos = accionSchema.parse(await req.json());
    const items = itemsDe(auditoria.items);
    const respuestas = respuestasDe(auditoria.respuestas);

    if (datos.accion === "responder") {
      if (datos.indice >= items.length) throw new ErrorPermiso("Punto inexistente", 400);
      respuestas[datos.indice] = {
        resultado: datos.resultado,
        comentario: datos.comentario || null,
        fotoUrl: datos.fotoUrl || null,
      };
      const actualizada = await prisma.auditoria.update({ where: { id: auditoria.id }, data: { respuestas } });
      return Response.json(actualizada);
    }

    const faltantes = respuestas
      .map((r, i) => {
        if (!r.resultado) return `Falta evaluar el punto ${i + 1}`;
        if (r.resultado === "no" && !r.comentario) return `El punto ${i + 1} necesita describir el hallazgo`;
        if (r.resultado === "no" && items[i]?.requiereFoto && !r.fotoUrl) return `El punto ${i + 1} necesita foto del hallazgo`;
        return null;
      })
      .filter(Boolean);
    if (faltantes.length) throw new ErrorPermiso(faltantes[0]!, 400);

    const { puntaje, hallazgos } = calcularPuntaje(respuestas);
    const completada = await prisma.auditoria.update({
      where: { id: auditoria.id },
      data: { estado: "completada", completadaEn: new Date(), puntaje, hallazgos },
    });

    if (hallazgos > 0) {
      const destinatarios = (await idsPorRol("ADMIN", "SUPERVISOR")).filter((id) => id !== user.id);
      await notificar(destinatarios, {
        tipo: "auditoria_hallazgos",
        titulo: "📋 Auditoría con hallazgos",
        mensaje: `${auditoria.nombrePlantilla}${auditoria.planta ? ` (${auditoria.planta})` : ""}: ${hallazgos} hallazgo(s), ${puntaje.toFixed(0)}% de cumplimiento`,
        url: `/auditorias/${auditoria.id}`,
      }).catch((e) => console.error("No se pudo notificar la auditoría", e));
    }
    return Response.json(completada);
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, auditoria } = await visible(params.id);
    if (auditoria.estado !== "borrador" && user.rol !== "ADMIN") throw new ErrorPermiso("Solo Admin puede borrar auditorías completadas");
    if (auditoria.auditorId !== user.id && !esLiderazgo(user.rol)) throw new ErrorPermiso("Sin permiso");
    await prisma.auditoria.delete({ where: { id: auditoria.id } });
    return Response.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
