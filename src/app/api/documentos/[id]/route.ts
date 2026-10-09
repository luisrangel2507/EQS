import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { puedeAprobarDocumentos, puedeCrearDocumentos, puedeVerDocumentos, verBorradores } from "@/lib/documentos";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    if (!puedeVerDocumentos(user.rol)) throw new ErrorPermiso("Sin permiso");
    const doc = await prisma.documento.findUnique({
      where: { id: params.id },
      include: {
        creadoPor: { select: { nombre: true } },
        versiones: {
          orderBy: { version: "desc" },
          include: {
            creadoPor: { select: { id: true, nombre: true } },
            revisadoPor: { select: { nombre: true } },
            _count: { select: { lecturas: true } },
            lecturas: { where: { usuarioId: user.id }, select: { id: true } },
          },
        },
      },
    });
    if (!doc) throw new ErrorPermiso("Documento no encontrado", 404);
    const ve = verBorradores(user.rol);
    const versiones = doc.versiones
      .filter((v) => ve || v.estado === "vigente")
      .map(({ lecturas, ...v }) => ({ ...v, leido: lecturas.length > 0 }));
    if (!versiones.length) throw new ErrorPermiso("Documento no encontrado", 404);
    const aprobadores = await prisma.usuario.count({ where: { activo: true, rol: { in: ["ADMIN", "SUPERVISOR", "GERENTE"] } } });
    const inspectores = await prisma.usuario.count({ where: { activo: true, rol: "INSPECTOR" } });
    return Response.json({
      ...doc,
      versiones,
      inspectoresActivos: inspectores,
      puedeSubirVersion: puedeCrearDocumentos(user.rol),
      puedeAprobar: puedeAprobarDocumentos(user.rol),
      unicoAprobador: aprobadores <= 1,
      usuarioId: user.id,
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
