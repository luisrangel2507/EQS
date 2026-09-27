import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { facturacionDelMes, parsearMes, TASA_IVA } from "@/lib/facturacion";
import EstadoCuenta from "@/lib/pdf/EstadoCuenta";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requerirRol("ADMIN", "GERENTE");
    const periodo = parsearMes(req.nextUrl.searchParams.get("mes"));
    const cliente = req.nextUrl.searchParams.get("cliente");
    if (!periodo || !cliente) throw new ErrorPermiso("Faltan mes o cliente", 400);

    const datos = await facturacionDelMes(periodo.anio, periodo.mes, cliente === "Sin cliente" ? null : cliente);
    const grupo = datos.clientes.find((c) => c.cliente === cliente);
    if (!grupo) throw new ErrorPermiso("Ese cliente no tiene piezas en el periodo", 404);

    const nombreMes = new Date(Date.UTC(periodo.anio, periodo.mes - 1, 15)).toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    const buffer = await renderToBuffer(
      <EstadoCuenta cliente={cliente} periodo={nombreMes} lineas={grupo.lineas} tasaIva={TASA_IVA} />
    );
    const archivo = `EstadoCuenta_${cliente.replace(/[^a-z0-9]+/gi, "_")}_${periodo.anio}-${String(periodo.mes).padStart(2, "0")}.pdf`;
    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${archivo}"` },
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
