import { NextRequest } from "next/server";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";
import { rangoPeriodo, reporteAsistencia } from "@/lib/asistenciaReporte";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requerirRol("ADMIN", "SUPERVISOR", "GERENTE", "LIDER");
    const periodo = req.nextUrl.searchParams.get("periodo") ?? "hoy";
    const { inicio, fin } = rangoPeriodo(periodo);
    const datos = await reporteAsistencia(inicio, fin, req.nextUrl.searchParams.get("cliente"));
    return Response.json({ periodo, inicio: inicio.toISOString(), ...datos });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
