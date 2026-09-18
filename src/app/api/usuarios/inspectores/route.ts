import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";

// Lista ligera de inspectores activos, para asignarlos a una inspección.
// Accesible por Admin y Supervisor (quienes crean/editan inspecciones).
export async function GET() {
  try {
    await requerirRol("ADMIN", "SUPERVISOR");
    const inspectores = await prisma.usuario.findMany({
      where: { rol: "INSPECTOR", activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    });
    return Response.json(inspectores);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
