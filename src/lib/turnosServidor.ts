import { prisma } from "@/lib/prisma";

/** Números de piso en una ventana de tiempo, opcionalmente de una sola planta. */
export async function resumenVentana(inicio: Date, fin: Date, planta?: string | null) {
  const capturas = await prisma.captura.findMany({
    where: {
      creadoEn: { gte: inicio, lt: fin },
      ...(planta ? { inspeccion: { planta } } : {}),
    },
    select: {
      buenas: true,
      malas: true,
      defecto: true,
      usuario: { select: { id: true, nombre: true } },
      inspeccion: { select: { id: true, nombre: true, numeroParte: true } },
    },
  });

  const porInspector = new Map<string, { nombre: string; buenas: number; malas: number }>();
  const porInspeccion = new Map<string, { id: string; nombre: string; buenas: number; malas: number }>();
  const defectos = new Map<string, number>();
  let buenas = 0;
  let malas = 0;

  for (const c of capturas) {
    buenas += c.buenas;
    malas += c.malas;
    const insp = porInspector.get(c.usuario.id) ?? { nombre: c.usuario.nombre, buenas: 0, malas: 0 };
    insp.buenas += c.buenas;
    insp.malas += c.malas;
    porInspector.set(c.usuario.id, insp);
    const pieza = porInspeccion.get(c.inspeccion.id) ?? {
      id: c.inspeccion.id,
      nombre: c.inspeccion.numeroParte ?? c.inspeccion.nombre,
      buenas: 0,
      malas: 0,
    };
    pieza.buenas += c.buenas;
    pieza.malas += c.malas;
    porInspeccion.set(c.inspeccion.id, pieza);
    if (c.defecto && c.malas > 0) defectos.set(c.defecto, (defectos.get(c.defecto) ?? 0) + c.malas);
  }

  const apoyos = await prisma.solicitudApoyo.count({
    where: {
      creadoEn: { gte: inicio, lt: fin },
      ...(planta ? { inspeccion: { planta } } : {}),
    },
  });

  const ordenar = <T extends { buenas: number; malas: number }>(lista: T[]) =>
    lista.sort((a, b) => b.buenas + b.malas - (a.buenas + a.malas));

  return {
    buenas,
    malas,
    apoyos,
    porInspector: ordenar(Array.from(porInspector.values())),
    porInspeccion: ordenar(Array.from(porInspeccion.values())),
    topDefectos: Array.from(defectos.entries())
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5),
  };
}
