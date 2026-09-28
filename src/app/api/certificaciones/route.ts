import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso, esLiderazgo } from "@/lib/permissions";
import { preguntasDe } from "@/lib/certificaciones";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requerirSesion();
    const liderazgo = esLiderazgo(user.rol);
    if (!liderazgo && user.rol !== "INSPECTOR") throw new ErrorPermiso("Sin acceso a certificaciones");

    const criterios = await prisma.criterioParte.findMany({ orderBy: { numeroParte: "asc" } });
    const certificaciones = await prisma.certificacion.findMany({
      where: liderazgo ? {} : { usuarioId: user.id },
      include: { otorgadaPor: { select: { nombre: true } } },
    });
    const inspectores = liderazgo
      ? await prisma.usuario.findMany({
          where: { rol: "INSPECTOR", activo: true },
          select: { id: true, nombre: true },
          orderBy: { nombre: "asc" },
        })
      : [];

    return Response.json({
      criterios: criterios.map((c) => ({
        ...c,
        // el inspector nunca recibe la respuesta correcta: se califica en el servidor
        preguntas: preguntasDe(c.preguntas).map((p) => (liderazgo ? p : { texto: p.texto, opciones: p.opciones })),
      })),
      certificaciones,
      inspectores,
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
