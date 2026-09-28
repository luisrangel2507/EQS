import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";
import { certificadosEn } from "@/lib/certificaciones";

export const dynamic = "force-dynamic";

// Lista ligera de inspectores activos, para asignarlos a una inspección.
// Con ?numeroParte= indica quién está certificado en esa parte.
export async function GET(req: NextRequest) {
  try {
    await requerirRol("ADMIN", "SUPERVISOR");
    const inspectores = await prisma.usuario.findMany({
      where: { rol: "INSPECTOR", activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    });
    const { requiere, certificados } = await certificadosEn(req.nextUrl.searchParams.get("numeroParte"));
    return Response.json(
      inspectores.map((i) => ({ ...i, requiereCertificacion: requiere, certificado: requiere ? certificados.has(i.id) : null }))
    );
  } catch (error) {
    return manejarErrorApi(error);
  }
}
