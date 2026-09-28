import { NextRequest } from "next/server";
import { existsSync } from "fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { itemsDe, respuestasDe } from "@/lib/auditorias";
import { whereAuditoriasVisibles } from "@/lib/auditoriasServidor";
import { archivoDeUrl, nombreArchivoSeguro } from "@/lib/uploads";
import AuditoriaPdf from "@/lib/pdf/AuditoriaPdf";
import { idiomaServidor } from "@/lib/i18nServidor";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    const a = await prisma.auditoria.findFirst({
      where: { id: params.id, ...whereAuditoriasVisibles(user) },
      include: { auditor: { select: { nombre: true } } },
    });
    if (!a) throw new ErrorPermiso("Auditoría no encontrada", 404);

    const respuestas = respuestasDe(a.respuestas);
    const fotos: Record<number, string> = {};
    respuestas.forEach((r, i) => {
      const archivo = archivoDeUrl(r.fotoUrl);
      const seguro = archivo ? nombreArchivoSeguro(archivo) : null;
      // react-pdf solo pinta JPG/PNG
      if (seguro && /\.(jpe?g|png)$/i.test(seguro.nombre) && existsSync(seguro.ruta)) fotos[i] = seguro.ruta;
    });

    const buffer = await renderToBuffer(
      <AuditoriaPdf
        idioma={idiomaServidor()}
        a={{
          folio: a.folio,
          nombrePlantilla: a.nombrePlantilla,
          planta: a.planta,
          cliente: a.cliente,
          area: a.area,
          auditor: a.auditor.nombre,
          completadaEn: a.completadaEn?.toISOString() ?? null,
          puntaje: a.puntaje,
          hallazgos: a.hallazgos,
          items: itemsDe(a.items),
          respuestas,
          fotos,
        }}
      />
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Auditoria_A-${String(a.folio).padStart(4, "0")}.pdf"`,
      },
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
