import { NextRequest } from "next/server";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { facturacionDelMes, parsearMes, TASA_IVA } from "@/lib/facturacion";
import { mesActualLocal } from "@/lib/turnos";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requerirRol("ADMIN", "GERENTE");
    const periodo = parsearMes(req.nextUrl.searchParams.get("mes")) ?? mesActualLocal();
    if (!periodo) throw new ErrorPermiso("Mes inválido", 400);

    const actual = await facturacionDelMes(periodo.anio, periodo.mes);

    // tendencia de los 6 meses que terminan en el mes consultado
    const historico = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(Date.UTC(periodo.anio, periodo.mes - 1 - i, 1));
      const anio = fecha.getUTCFullYear();
      const mes = fecha.getUTCMonth() + 1;
      const datos = i === 0 ? actual : await facturacionDelMes(anio, mes);
      historico.push({ mes: `${anio}-${String(mes).padStart(2, "0")}`, subtotal: datos.subtotal, piezas: datos.piezas });
    }

    return Response.json({
      mes: `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}`,
      tasaIva: TASA_IVA,
      subtotal: actual.subtotal,
      piezas: actual.piezas,
      clientes: actual.clientes,
      sinPrecio: actual.sinPrecio,
      historico,
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
