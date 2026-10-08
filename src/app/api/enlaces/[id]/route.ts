import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrar } from "@/lib/bitacora";
import { requerirSesion, manejarErrorApi, ErrorPermiso, esSupervisorOAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    const enlace = await prisma.enlaceCompartido.findUnique({ where: { id: params.id } });
    if (!enlace) throw new ErrorPermiso("Enlace no encontrado", 404);
    if (enlace.creadoPorId !== user.id && !esSupervisorOAdmin(user.rol)) {
      throw new ErrorPermiso("Solo quien creó el enlace o un Supervisor/Admin puede revocarlo");
    }
    await prisma.enlaceCompartido.update({ where: { id: params.id }, data: { revocado: true } });
    await registrar(user, {
      accion: "ANULAR",
      entidad: "Enlace",
      entidadId: params.id,
      resumen: "Revocó un enlace compartido",
      antes: { inspeccionId: enlace.inspeccionId, revocado: false },
      despues: { revocado: true },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
