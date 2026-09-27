import { NextRequest } from "next/server";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { obtenerInspeccionVisible } from "@/lib/inspecciones";
import { spcDeInspeccion } from "@/lib/spc";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    if (!(await obtenerInspeccionVisible(user, params.id))) throw new ErrorPermiso("Inspección no encontrada", 404);
    return Response.json(await spcDeInspeccion(params.id));
  } catch (error) {
    return manejarErrorApi(error);
  }
}
