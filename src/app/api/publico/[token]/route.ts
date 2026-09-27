import { NextRequest } from "next/server";
import { enlaceVigente, datosPublicos } from "@/lib/compartido";

export const dynamic = "force-dynamic";

// Sin sesión a propósito: el token del enlace es la credencial.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const enlace = await enlaceVigente(params.token);
  if (!enlace) return Response.json({ error: "Este enlace ya no es válido" }, { status: 404 });
  const datos = await datosPublicos(enlace.inspeccionId, params.token);
  if (!datos) return Response.json({ error: "Inspección no encontrada" }, { status: 404 });
  return Response.json(datos, { headers: { "Cache-Control": "no-store" } });
}
