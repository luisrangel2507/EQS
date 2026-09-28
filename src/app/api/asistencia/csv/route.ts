import { NextRequest } from "next/server";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";
import { rangoPeriodo, reporteAsistencia } from "@/lib/asistenciaReporte";
import { ZONA_HORARIA } from "@/lib/turnos";

export const dynamic = "force-dynamic";

const escapar = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const local = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-MX", { timeZone: ZONA_HORARIA, dateStyle: "short", timeStyle: "short" }) : "";

export async function GET(req: NextRequest) {
  try {
    await requerirRol("ADMIN", "SUPERVISOR", "GERENTE", "LIDER");
    const periodo = req.nextUrl.searchParams.get("periodo") ?? "mes";
    const { inicio, fin } = rangoPeriodo(periodo);
    const { filas } = await reporteAsistencia(inicio, fin);
    const tabla = [["Inspector", "Cliente", "Número de parte", "Inspección", "Entrada", "Salida", "Horas", "Observaciones"]];
    for (const f of filas) {
      tabla.push([
        f.usuario.nombre,
        f.inspeccion?.cliente ?? "",
        f.inspeccion?.numeroParte ?? "",
        f.inspeccion?.nombre ?? "",
        local(f.entrada),
        local(f.salida),
        f.horas.toFixed(2),
        [f.cerradaAuto ? "Cerrada automáticamente" : "", f.automatica ? "Entrada automática" : "", f.nota ?? ""].filter(Boolean).join("; "),
      ]);
    }
    return new Response("﻿" + tabla.map((r) => r.map(escapar).join(",")).join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Asistencia_${periodo}.csv"`,
      },
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
