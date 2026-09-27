import { prisma } from "@/lib/prisma";
import { TOLERANCIA_MINUTOS, UMBRAL_RECHAZO_CRITICO } from "@/lib/constants";
import { turnoEn } from "@/lib/turnos";
import { resumenVentana } from "@/lib/turnosServidor";
import { calcularPronostico, calcularSubgrupos, type Pronostico } from "@/lib/spc";

export type Andon = "rojo" | "amarillo" | "verde";

export type SorteoTv = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  cliente: string | null;
  planta: string | null;
  buenas: number;
  malas: number;
  rechazo: number;
  meta: number;
  avance: number | null;
  pronostico: Pronostico;
  topDefectos: { tipo: string; cantidad: number }[];
  inspectores: string[];
  minutosSinCaptura: number | null;
  fueraDeControl: boolean;
  apoyos: number;
  andon: Andon;
  motivos: string[];
};

export type AlertaTv = { id: string; nivel: "critica" | "aviso"; texto: string; desde: string };

const UMBRAL_RECHAZO_AVISO = 0.05;

function textoMinutos(min: number) {
  if (min < 90) return `${min} min`;
  if (min < 48 * 60) return `${(min / 60).toFixed(1)} h`;
  return `${(min / 1440).toFixed(1)} días`;
}
const MIN_PARADO = 60;

export async function datosTv(planta: string | null) {
  const ahora = Date.now();
  const { turno, inicio, fin } = turnoEn();
  const filtroPlanta = planta ? { planta } : {};

  const [inspecciones, resumen, apoyos, estados] = await Promise.all([
    prisma.inspeccion.findMany({
      where: { cerrado: false, ...filtroPlanta },
      include: {
        defectos: { orderBy: { cantidad: "desc" }, take: 5 },
        inspectores: { include: { usuario: { select: { nombre: true } } } },
      },
    }),
    resumenVentana(inicio, new Date(), planta),
    prisma.solicitudApoyo.findMany({
      where: { atendida: false, ...(planta ? { inspeccion: { planta } } : {}) },
      orderBy: { creadoEn: "asc" },
      include: {
        usuario: { select: { nombre: true } },
        inspeccion: { select: { id: true, numeroParte: true, nombre: true } },
      },
    }),
    prisma.estadoInspector.findMany({
      where: { usuario: { activo: true, rol: "INSPECTOR" }, estado: { not: "activo" } },
      include: { usuario: { select: { nombre: true } } },
    }),
  ]);

  const capturas = await prisma.captura.findMany({
    where: { inspeccionId: { in: inspecciones.map((i) => i.id) } },
    orderBy: { creadoEn: "asc" },
    select: { inspeccionId: true, buenas: true, malas: true, creadoEn: true },
  });
  const capturasPor = new Map<string, typeof capturas>();
  for (const c of capturas) {
    const lista = capturasPor.get(c.inspeccionId) ?? [];
    lista.push(c);
    capturasPor.set(c.inspeccionId, lista);
  }

  const sorteos: SorteoTv[] = inspecciones.map((i) => {
    const propias = capturasPor.get(i.id) ?? [];
    const total = i.piezasBuenas + i.piezasMalas;
    const rechazo = total > 0 ? i.piezasMalas / total : 0;
    const { subgrupos } = calcularSubgrupos(propias);
    const ultimoSubgrupo = subgrupos[subgrupos.length - 1];
    const fueraDeControl = subgrupos.length >= 3 && Boolean(ultimoSubgrupo?.fuera || ultimoSubgrupo?.tendencia);
    const pronostico = calcularPronostico(i.meta, total, i.fechaEntrega, propias, ahora);
    const ultima = propias[propias.length - 1]?.creadoEn;
    const minutosSinCaptura = ultima ? Math.floor((ahora - ultima.getTime()) / 60000) : null;
    const apoyosAqui = apoyos.filter((a) => a.inspeccion?.id === i.id).length;

    const rojos: string[] = [];
    const amarillos: string[] = [];
    if (total > 0 && rechazo >= UMBRAL_RECHAZO_CRITICO) rojos.push(`Rechazo ${(rechazo * 100).toFixed(1)}%`);
    if (fueraDeControl) rojos.push("Fuera de control");
    if (apoyosAqui > 0) rojos.push("Piden apoyo");
    if (pronostico.estado === "en_riesgo") amarillos.push("Entrega en riesgo");
    if (total > 0 && rechazo >= UMBRAL_RECHAZO_AVISO && rechazo < UMBRAL_RECHAZO_CRITICO) amarillos.push("Rechazo al alza");
    if (minutosSinCaptura !== null && minutosSinCaptura >= MIN_PARADO) amarillos.push(`Sin capturas ${textoMinutos(minutosSinCaptura)}`);

    return {
      id: i.id,
      nombre: i.nombre,
      numeroParte: i.numeroParte,
      cliente: i.cliente,
      planta: i.planta,
      buenas: i.piezasBuenas,
      malas: i.piezasMalas,
      rechazo,
      meta: i.meta,
      avance: i.meta > 0 ? Math.min(1, total / i.meta) : null,
      pronostico,
      topDefectos: i.defectos.map((d) => ({ tipo: d.tipo, cantidad: d.cantidad })),
      inspectores: i.inspectores.map((a) => a.usuario.nombre),
      minutosSinCaptura,
      fueraDeControl,
      apoyos: apoyosAqui,
      andon: rojos.length ? "rojo" : amarillos.length ? "amarillo" : "verde",
      motivos: [...rojos, ...amarillos],
    };
  });

  const peso: Record<Andon, number> = { rojo: 0, amarillo: 1, verde: 2 };
  sorteos.sort((a, b) => peso[a.andon] - peso[b.andon] || b.buenas + b.malas - (a.buenas + a.malas));

  const alertas: AlertaTv[] = [
    ...apoyos.map((a) => ({
      id: `apoyo-${a.id}`,
      nivel: "critica" as const,
      texto: `🔔 ${a.usuario.nombre} pide apoyo${a.estacion ? ` en ${a.estacion}` : ""}${
        a.inspeccion ? ` · ${a.inspeccion.numeroParte ?? a.inspeccion.nombre}` : ""
      }`,
      desde: a.creadoEn.toISOString(),
    })),
    ...sorteos
      .filter((s) => s.andon === "rojo" && s.apoyos === 0)
      .map((s) => ({
        id: `sorteo-${s.id}`,
        nivel: "critica" as const,
        texto: `🔴 ${s.numeroParte ?? s.nombre}: ${s.motivos.join(" · ")}`,
        desde: new Date(ahora).toISOString(),
      })),
    ...estados
      .filter((e) => Math.floor((ahora - e.desde.getTime()) / 60000) >= (TOLERANCIA_MINUTOS[e.estado] ?? 15))
      .map((e) => ({
        id: `pausa-${e.usuarioId}`,
        nivel: "aviso" as const,
        texto: `⏸️ ${e.usuario.nombre} lleva ${textoMinutos(Math.floor((ahora - e.desde.getTime()) / 60000))} en ${e.estado}`,
        desde: e.desde.toISOString(),
      })),
    ...sorteos
      .filter((s) => s.andon === "amarillo")
      .map((s) => ({
        id: `aviso-${s.id}`,
        nivel: "aviso" as const,
        texto: `🟡 ${s.numeroParte ?? s.nombre}: ${s.motivos.join(" · ")}`,
        desde: new Date(ahora).toISOString(),
      })),
  ];

  const totalTurno = resumen.buenas + resumen.malas;
  const horasTurno = Math.max((ahora - inicio.getTime()) / 3600000, 1 / 60);

  return {
    ahora: new Date(ahora).toISOString(),
    planta,
    turno: { valor: turno.valor, inicio: inicio.toISOString(), fin: fin.toISOString() },
    kpis: {
      piezasTurno: totalTurno,
      rechazoTurno: totalTurno > 0 ? resumen.malas / totalTurno : 0,
      ritmoTurno: totalTurno / horasTurno,
      sorteosActivos: sorteos.length,
      enRojo: sorteos.filter((s) => s.andon === "rojo").length,
    },
    sorteos,
    alertas,
  };
}

export type DatosTv = Awaited<ReturnType<typeof datosTv>>;
