import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { notificar } from "@/lib/notificar";

export const dynamic = "force-dynamic";

const ETIQUETA_TIPO: Record<string, string> = {
  sorteo: "Sorteo",
  retrabajo: "Retrabajo",
  inspeccion_recibo: "Inspección de recibo",
  otro: "Servicio",
};

const accionSchema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("aceptar"), respuesta: z.string().trim().max(2000).optional() }),
  z.object({ accion: z.literal("rechazar"), respuesta: z.string().trim().min(3, "Explica el motivo del rechazo").max(2000) }),
]);

// Aceptar crea la inspección con lo que pidió el cliente; los inspectores y el precio se ajustan después.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirRol("ADMIN", "SUPERVISOR");
    const datos = accionSchema.parse(await req.json());
    const solicitud = await prisma.solicitudServicio.findUnique({ where: { id: params.id } });
    if (!solicitud) throw new ErrorPermiso("Solicitud no encontrada", 404);
    if (solicitud.estado !== "pendiente") throw new ErrorPermiso("Esta solicitud ya fue atendida", 400);

    const resultado = await prisma.$transaction(async (tx) => {
      const inspeccion =
        datos.accion === "aceptar"
          ? await tx.inspeccion.create({
              data: {
                organizacionId: user.organizacionId,
                nombre: `${ETIQUETA_TIPO[solicitud.tipo] ?? "Servicio"} ${solicitud.numeroParte} · Solicitud #${solicitud.folio}`,
                numeroParte: solicitud.numeroParte,
                cliente: solicitud.cliente,
                planta: solicitud.planta,
                meta: solicitud.cantidad ?? 0,
                instrucciones: solicitud.descripcion,
              },
            })
          : null;
      return tx.solicitudServicio.update({
        where: { id: solicitud.id },
        data: {
          estado: datos.accion === "aceptar" ? "aceptada" : "rechazada",
          respuesta: datos.respuesta || null,
          atendidaPorId: user.id,
          atendidaEn: new Date(),
          inspeccionId: inspeccion?.id ?? null,
        },
      });
    });

    await notificar([solicitud.solicitanteId], {
      tipo: "solicitud_respuesta",
      titulo: datos.accion === "aceptar" ? "✅ Solicitud aceptada" : "Solicitud no aceptada",
      mensaje:
        datos.accion === "aceptar"
          ? `Tu solicitud #${solicitud.folio} (${solicitud.numeroParte}) fue aceptada; ya puedes seguir su avance en vivo.`
          : `Tu solicitud #${solicitud.folio} (${solicitud.numeroParte}) no fue aceptada: ${datos.respuesta}`,
      url: resultado.inspeccionId ? `/inspecciones/${resultado.inspeccionId}` : "/solicitudes",
      inspeccionId: resultado.inspeccionId ?? undefined,
    }).catch((e) => console.error("No se pudo notificar la respuesta", e));

    return Response.json(resultado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
