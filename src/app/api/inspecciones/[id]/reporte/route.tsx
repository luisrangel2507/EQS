import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { whereInspeccionesVisibles } from "@/lib/inspecciones";
import ReporteCierre from "@/lib/pdf/ReporteCierre";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    const inspeccion = await prisma.inspeccion.findFirst({
      where: { id: params.id, ...whereInspeccionesVisibles(user) },
      include: { defectos: true },
    });
    if (!inspeccion) throw new ErrorPermiso("Inspección no encontrada", 404);
    if (!inspeccion.cerrado) {
      throw new ErrorPermiso("El reporte de cierre solo está disponible una vez cerrada la inspección", 400);
    }

    const buffer = await renderToBuffer(
      <ReporteCierre
        datos={{
          nombre: inspeccion.nombre,
          numeroParte: inspeccion.numeroParte,
          cliente: inspeccion.cliente,
          planta: inspeccion.planta,
          meta: inspeccion.meta,
          fechaEntrega: inspeccion.fechaEntrega?.toISOString() ?? null,
          instrucciones: inspeccion.instrucciones,
          piezasBuenas: inspeccion.piezasBuenas,
          piezasMalas: inspeccion.piezasMalas,
          cerradoPor: inspeccion.cerradoPor,
          cerradoEn: inspeccion.cerradoEn?.toISOString() ?? null,
          creadoEn: inspeccion.creadoEn.toISOString(),
          defectos: inspeccion.defectos,
        }}
      />
    );

    const nombreArchivo = `Reporte_${inspeccion.nombre.replace(/[^a-z0-9]+/gi, "_")}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nombreArchivo}"`,
      },
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
