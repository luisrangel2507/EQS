import { prisma } from "@/lib/prisma";
import { cerrarOlvidadas, horasEnRango } from "@/lib/asistencia";
import { inicioDiaLocal, mesActualLocal, rangoMes } from "@/lib/turnos";

export function rangoPeriodo(periodo: string) {
  const fin = new Date(Date.now() + 1);
  if (periodo === "hoy") return { inicio: inicioDiaLocal(), fin };
  if (periodo === "semana") return { inicio: inicioDiaLocal(new Date(), 6), fin };
  const { anio, mes } = mesActualLocal();
  return { inicio: rangoMes(anio, mes).inicio, fin };
}

export async function reporteAsistencia(inicio: Date, fin: Date, cliente?: string | null) {
  await cerrarOlvidadas();
  const registros = await prisma.registroAsistencia.findMany({
    where: {
      entrada: { lt: fin },
      OR: [{ salida: null }, { salida: { gt: inicio } }],
      ...(cliente ? { inspeccion: { cliente } } : {}),
    },
    orderBy: { entrada: "desc" },
    include: {
      usuario: { select: { id: true, nombre: true } },
      inspeccion: { select: { id: true, nombre: true, numeroParte: true, cliente: true, modoCobro: true, precioPorHora: true } },
    },
  });

  const filas = registros.map((r) => ({
    id: r.id,
    usuario: r.usuario,
    inspeccion: r.inspeccion,
    entrada: r.entrada.toISOString(),
    salida: r.salida?.toISOString() ?? null,
    horas: horasEnRango(r, inicio, fin),
    cerradaAuto: r.cerradaAuto,
    automatica: r.automatica,
    nota: r.nota,
  }));

  const sumar = (clave: (f: (typeof filas)[number]) => string) => {
    const mapa = new Map<string, number>();
    for (const f of filas) mapa.set(clave(f), (mapa.get(clave(f)) ?? 0) + f.horas);
    return Array.from(mapa.entries())
      .map(([nombre, horas]) => ({ nombre, horas }))
      .sort((a, b) => b.horas - a.horas);
  };

  return {
    filas,
    enPlanta: filas.filter((f) => !f.salida),
    porInspector: sumar((f) => f.usuario.nombre),
    porCliente: sumar((f) => f.inspeccion?.cliente ?? "Sin cliente"),
    totalHoras: filas.reduce((a, f) => a + f.horas, 0),
    porRevisar: filas.filter((f) => f.cerradaAuto).length,
  };
}
