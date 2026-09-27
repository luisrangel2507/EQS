import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// quien entra al turno confirma que recibió el relevo
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirRol("ADMIN", "SUPERVISOR", "GERENTE", "LIDER", "RESIDENTE");
    const relevo = await prisma.relevoTurno.findUnique({ where: { id: params.id } });
    if (!relevo) throw new ErrorPermiso("Relevo no encontrado", 404);
    if (user.rol === "RESIDENTE" && relevo.planta !== user.plantaResidente) {
      throw new ErrorPermiso("Ese relevo es de otra planta");
    }
    if (relevo.autorId === user.id) throw new ErrorPermiso("No puedes recibir tu propio relevo", 400);
    if (relevo.recibidoPorId) throw new ErrorPermiso("Este relevo ya fue recibido", 400);

    const actualizado = await prisma.relevoTurno.update({
      where: { id: params.id },
      data: { recibidoPorId: user.id, recibidoEn: new Date() },
    });
    return Response.json(actualizado);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
