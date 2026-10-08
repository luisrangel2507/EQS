import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { datosAnulacion, filaBitacora } from "@/lib/bitacora";

export const dynamic = "force-dynamic";

const VENTANA_DESHACER_MS = 2 * 60 * 1000;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; capturaId: string } }
) {
  try {
    const user = await requerirSesion();

    const captura = await prisma.captura.findFirst({
      where: { id: params.capturaId, inspeccionId: params.id },
      include: { inspeccion: { select: { cerrado: true } } },
    });
    if (!captura) throw new ErrorPermiso("Captura no encontrada", 404);
    if (captura.usuarioId !== user.id) {
      throw new ErrorPermiso("Solo quien hizo la captura puede deshacerla");
    }
    if (captura.inspeccion.cerrado) throw new ErrorPermiso("La inspección está cerrada", 400);
    if (Date.now() - captura.creadoEn.getTime() > VENTANA_DESHACER_MS) {
      throw new ErrorPermiso("Ya pasó el tiempo para deshacer esta captura", 400);
    }

    await prisma.$transaction([
      prisma.captura.update({
        where: { id: captura.id },
        data: datosAnulacion(user, "Deshecha por el inspector dentro de la ventana de 2 minutos"),
      }),
      filaBitacora(user, {
        accion: "ANULAR",
        entidad: "Captura",
        entidadId: captura.id,
        resumen: "Deshizo una captura",
        antes: { inspeccionId: params.id, buenas: captura.buenas, malas: captura.malas, retrabajadas: captura.retrabajadas, defecto: captura.defecto },
        motivo: "Deshecha por el inspector dentro de la ventana de 2 minutos",
      }),
      prisma.inspeccion.update({
        where: { id: params.id },
        data: {
          piezasBuenas: { decrement: captura.buenas },
          piezasMalas: { decrement: captura.malas },
          piezasRetrabajadas: { decrement: captura.retrabajadas },
        },
      }),
      ...(captura.defecto && captura.retrabajadas > 0
        ? [
            prisma.defectoResumen.updateMany({
              where: { inspeccionId: params.id, tipo: captura.defecto },
              data: { recuperadas: { decrement: captura.retrabajadas } },
            }),
          ]
        : []),
      ...(captura.defecto && captura.malas > 0
        ? [
            prisma.defectoResumen.updateMany({
              where: { inspeccionId: params.id, tipo: captura.defecto },
              data: { cantidad: { decrement: captura.malas } },
            }),
            prisma.defectoResumen.deleteMany({
              where: { inspeccionId: params.id, tipo: captura.defecto, cantidad: { lte: 0 } },
            }),
          ]
        : []),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
