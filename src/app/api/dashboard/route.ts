import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, esLiderazgo } from "@/lib/permissions";
import { whereInspeccionesVisibles } from "@/lib/inspecciones";
import { TOLERANCIA_MINUTOS, UMBRAL_RECHAZO_CRITICO } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requerirSesion();
    const where = whereInspeccionesVisibles(user);

    const inspecciones = await prisma.inspeccion.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      include: {
        inspectores: { select: { usuarioId: true } },
        defectos: true,
      },
    });

    const activas = inspecciones.filter((i) => !i.cerrado);

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const capturasMes = await prisma.captura.groupBy({
      by: ["inspeccionId"],
      where: { inspeccion: { ...where }, creadoEn: { gte: inicioMes } },
      _sum: { buenas: true, malas: true },
    });

    const precioPorId = new Map(inspecciones.map((i) => [i.id, i.precioPorPieza]));
    let piezasInspeccionadasMes = 0;
    let facturadoMes = 0;
    for (const c of capturasMes) {
      const piezas = (c._sum.buenas ?? 0) + (c._sum.malas ?? 0);
      piezasInspeccionadasMes += piezas;
      facturadoMes += piezas * (precioPorId.get(c.inspeccionId) ?? 0);
    }

    const totalBuenas = activas.reduce((acc, i) => acc + i.piezasBuenas, 0);
    const totalMalas = activas.reduce((acc, i) => acc + i.piezasMalas, 0);
    const totalPiezas = totalBuenas + totalMalas;
    const porcentajeRechazoGlobal = totalPiezas > 0 ? totalMalas / totalPiezas : 0;

    const inspeccionesConRechazo = activas.map((i) => {
      const total = i.piezasBuenas + i.piezasMalas;
      const porcentajeRechazo = total > 0 ? i.piezasMalas / total : 0;
      return { ...i, porcentajeRechazo };
    });

    const enCritico = inspeccionesConRechazo.filter(
      (i) => i.porcentajeRechazo >= UMBRAL_RECHAZO_CRITICO && i.piezasBuenas + i.piezasMalas > 0
    );

    const kpis = {
      inspeccionesActivas: activas.length,
      piezasInspeccionadasMes,
      facturadoMes: esLiderazgo(user.rol) ? facturadoMes : null,
      porcentajeRechazoGlobal,
      inspeccionesEnCritico: enCritico.length,
    };

    let alertasRechazo: typeof enCritico = [];
    let inspectoresEnPausa: Array<{
      usuarioId: string;
      nombre: string;
      estado: string;
      desde: string;
      minutos: number;
    }> = [];
    let estadoInspectores: Array<{
      usuarioId: string;
      nombre: string;
      estado: string;
      desde: string;
    }> = [];
    let sorteosAbiertos: Array<{
      id: string;
      nombre: string;
      numeroParte: string | null;
      cliente: string | null;
      planta: string | null;
      piezasBuenas: number;
      piezasMalas: number;
      inspectoresRevisando: number;
      topDefecto: string | null;
    }> = [];

    if (esLiderazgo(user.rol)) {
      alertasRechazo = enCritico;

      const estados = await prisma.estadoInspector.findMany({
        include: { usuario: { select: { id: true, nombre: true, rol: true, activo: true } } },
      });

      const ahora = Date.now();
      estadoInspectores = estados
        .filter((e) => e.usuario.activo)
        .map((e) => ({
          usuarioId: e.usuarioId,
          nombre: e.usuario.nombre,
          estado: e.estado,
          desde: e.desde.toISOString(),
        }));

      inspectoresEnPausa = estados
        .filter((e) => e.usuario.activo && e.estado !== "activo")
        .map((e) => {
          const minutos = Math.floor((ahora - e.desde.getTime()) / 60000);
          return { usuarioId: e.usuarioId, nombre: e.usuario.nombre, estado: e.estado, desde: e.desde.toISOString(), minutos };
        })
        .filter((e) => superaTolerancia(e.estado, e.minutos));

      const inspectoresActivosIds = new Set(
        estados.filter((e) => e.estado === "activo").map((e) => e.usuarioId)
      );

      sorteosAbiertos = activas.map((i) => {
        const topDefecto = [...i.defectos].sort((a, b) => b.cantidad - a.cantidad)[0]?.tipo ?? null;
        const inspectoresRevisando = i.inspectores.filter((a) =>
          inspectoresActivosIds.has(a.usuarioId)
        ).length;
        return {
          id: i.id,
          nombre: i.nombre,
          numeroParte: i.numeroParte,
          cliente: i.cliente,
          planta: i.planta,
          piezasBuenas: i.piezasBuenas,
          piezasMalas: i.piezasMalas,
          inspectoresRevisando,
          topDefecto,
        };
      });
    }

    return Response.json({
      kpis,
      alertasRechazo,
      inspectoresEnPausa,
      estadoInspectores,
      sorteosAbiertos,
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}

function superaTolerancia(estado: string, minutos: number) {
  const tolerancia = TOLERANCIA_MINUTOS[estado] ?? 15;
  return minutos >= tolerancia;
}
