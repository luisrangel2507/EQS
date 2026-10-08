import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { registrar } from "@/lib/bitacora";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirRol("ADMIN", "SUPERVISOR");
    const criterio = await prisma.criterioParte.findUnique({ where: { id: params.id } });
    if (!criterio) throw new ErrorPermiso("Criterio no encontrado", 404);
    await prisma.criterioParte.delete({ where: { id: params.id } });
    await registrar(user, {
      accion: "ELIMINAR",
      entidad: "Criterio",
      entidadId: params.id,
      resumen: "Eliminó un criterio de certificación por número de parte",
      antes: criterio,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
