import { NextRequest } from "next/server";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { facturacionDelMes, parsearMes } from "@/lib/facturacion";

export const dynamic = "force-dynamic";

const escapar = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET(req: NextRequest) {
  try {
    await requerirRol("ADMIN", "GERENTE");
    const periodo = parsearMes(req.nextUrl.searchParams.get("mes"));
    if (!periodo) throw new ErrorPermiso("Mes inválido", 400);
    const datos = await facturacionDelMes(periodo.anio, periodo.mes);

    const filas = [["Cliente", "Número de parte", "Inspección", "Planta", "Cobro", "Piezas", "Horas", "Precio unitario", "Importe"]];
    for (const c of datos.clientes) {
      for (const l of c.lineas) {
        filas.push([
          c.cliente,
          l.numeroParte ?? "",
          l.nombre,
          l.planta ?? "",
          l.modo === "hora" ? "Por hora" : "Por pieza",
          String(l.piezas),
          l.horas.toFixed(2),
          l.precio.toFixed(2),
          l.importe.toFixed(2),
        ]);
      }
    }
    const csv = "﻿" + filas.map((f) => f.map(escapar).join(",")).join("\n");
    const mes = `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Facturacion_${mes}.csv"`,
      },
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
