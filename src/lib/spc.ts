import { prisma } from "@/lib/prisma";
import { claveDiaLocal, ZONA_HORARIA } from "@/lib/turnos";

export type Subgrupo = {
  inicio: string;
  etiqueta: string;
  n: number;
  malas: number;
  p: number;
  lcs: number;
  lci: number;
  fuera: boolean;
  tendencia: boolean;
};

export type Pronostico = {
  restante: number;
  ritmo: number;
  horas: number | null;
  eta: string | null;
  estado: "sin_meta" | "terminada" | "sin_ritmo" | "a_tiempo" | "en_riesgo" | "sin_fecha";
};

const HORAS_VENTANA_RITMO = 4;
const PUNTOS_TENDENCIA = 8;

function claveHora(fecha: Date) {
  const hora = new Intl.DateTimeFormat("en-US", { timeZone: ZONA_HORARIA, hour: "numeric", hourCycle: "h23" }).format(fecha);
  return `${claveDiaLocal(fecha)} ${hora.padStart(2, "0")}`;
}

/** Gráfica p por hora: límites de 3σ variables según el tamaño de cada subgrupo. */
export function calcularSubgrupos(capturas: { buenas: number; malas: number; creadoEn: Date }[]) {
  const grupos = new Map<string, { inicio: Date; hora: string; n: number; malas: number }>();
  for (const c of capturas) {
    const clave = claveHora(c.creadoEn);
    const g = grupos.get(clave) ?? { inicio: c.creadoEn, hora: `${clave.slice(-2)}:00`, n: 0, malas: 0 };
    g.n += c.buenas + c.malas;
    g.malas += c.malas;
    grupos.set(clave, g);
  }
  const lista = Array.from(grupos.values()).filter((g) => g.n > 0);
  const totalN = lista.reduce((a, g) => a + g.n, 0);
  const totalMalas = lista.reduce((a, g) => a + g.malas, 0);
  const pBarra = totalN > 0 ? totalMalas / totalN : 0;

  let rachaArriba = 0;
  const subgrupos: Subgrupo[] = lista.map((g) => {
    const p = g.malas / g.n;
    const sigma = Math.sqrt((pBarra * (1 - pBarra)) / g.n);
    const lcs = Math.min(1, pBarra + 3 * sigma);
    const lci = Math.max(0, pBarra - 3 * sigma);
    rachaArriba = p > pBarra ? rachaArriba + 1 : 0;
    return {
      inicio: g.inicio.toISOString(),
      etiqueta: g.hora,
      n: g.n,
      malas: g.malas,
      p,
      lcs,
      lci,
      fuera: p > lcs || (lci > 0 && p < lci),
      tendencia: rachaArriba >= PUNTOS_TENDENCIA,
    };
  });

  return { subgrupos, pBarra };
}

/** A este ritmo, cuándo se llega a la meta (asume trabajo continuo, como en sorteo 24/7). */
export function calcularPronostico(
  meta: number,
  total: number,
  fechaEntrega: Date | null,
  capturas: { buenas: number; malas: number; creadoEn: Date }[],
  ahora = Date.now()
): Pronostico {
  if (meta <= 0) return { restante: 0, ritmo: 0, horas: null, eta: null, estado: "sin_meta" };
  const restante = Math.max(0, meta - total);
  if (restante === 0) return { restante, ritmo: 0, horas: 0, eta: null, estado: "terminada" };

  const desdeVentana = ahora - HORAS_VENTANA_RITMO * 3600000;
  const recientes = capturas.filter((c) => c.creadoEn.getTime() >= desdeVentana);
  const base = recientes.length > 0 ? recientes : capturas;
  if (base.length === 0) return { restante, ritmo: 0, horas: null, eta: null, estado: "sin_ritmo" };

  const piezas = base.reduce((a, c) => a + c.buenas + c.malas, 0);
  const primera = base[0].creadoEn.getTime();
  const ultima = recientes.length > 0 ? ahora : base[base.length - 1].creadoEn.getTime();
  const horasBase = Math.max((ultima - primera) / 3600000, 0.5);
  const ritmo = piezas / horasBase;
  const horas = restante / ritmo;
  const eta = new Date(ahora + horas * 3600000);

  return {
    restante,
    ritmo,
    horas,
    eta: eta.toISOString(),
    estado: !fechaEntrega ? "sin_fecha" : eta.getTime() <= fechaEntrega.getTime() ? "a_tiempo" : "en_riesgo",
  };
}

export async function spcDeInspeccion(inspeccionId: string) {
  const [inspeccion, capturas] = await Promise.all([
    prisma.inspeccion.findUniqueOrThrow({
      where: { id: inspeccionId },
      select: { meta: true, piezasBuenas: true, piezasMalas: true, fechaEntrega: true },
    }),
    prisma.captura.findMany({
      where: { inspeccionId },
      orderBy: { creadoEn: "asc" },
      select: { buenas: true, malas: true, creadoEn: true },
    }),
  ]);
  const { subgrupos, pBarra } = calcularSubgrupos(capturas);
  return {
    subgrupos,
    pBarra,
    fueraDeControl: subgrupos.filter((s) => s.fuera).length,
    tendencia: subgrupos.some((s) => s.tendencia),
    pronostico: calcularPronostico(
      inspeccion.meta,
      inspeccion.piezasBuenas + inspeccion.piezasMalas,
      inspeccion.fechaEntrega,
      capturas
    ),
  };
}

export type DatosSpc = Awaited<ReturnType<typeof spcDeInspeccion>>;
