import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { manejarErrorApi } from "@/lib/permissions";
import { obtener8DVisible } from "@/lib/ochoDServidor";
import { idiomaServidor } from "@/lib/i18nServidor";
import Reporte8DPdf from "@/lib/pdf/Reporte8DPdf";
import { datosOrganizacion } from "@/lib/organizaciones";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, reporte: r } = await obtener8DVisible(params.id);
    const buffer = await renderToBuffer(
      <Reporte8DPdf
        idioma={idiomaServidor()}
        empresa={await datosOrganizacion(user.organizacionId)}
        r={{
          ...r,
          creadoEn: r.creadoEn.toISOString(),
          cerradoEn: r.cerradoEn?.toISOString() ?? null,
          creadoPor: r.creadoPor.nombre,
        }}
      />
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="8D-${String(r.folio).padStart(4, "0")}.pdf"`,
      },
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
