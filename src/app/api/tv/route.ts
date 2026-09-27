import { NextRequest } from "next/server";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";
import { datosTv } from "@/lib/tv";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requerirRol("ADMIN", "SUPERVISOR", "GERENTE", "LIDER", "RESIDENTE");
    const planta = user.rol === "RESIDENTE" ? user.plantaResidente : req.nextUrl.searchParams.get("planta") || null;
    return Response.json(await datosTv(planta), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
