import { prisma } from "@/lib/prisma";
import { rangoMes } from "@/lib/turnos";

export const TASA_IVA = Number(process.env.TASA_IVA ?? 0.16);

export function parsearMes(valor: string | null) {
  const m = valor?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  return mes >= 1 && mes <= 12 ? { anio, mes } : null;
}

export type LineaFactura = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  planta: string | null;
  piezas: number;
  precio: number;
  importe: number;
};

/** Piezas inspeccionadas en el mes × precio por pieza, agrupado por cliente. */
export async function facturacionDelMes(anio: number, mes: number, cliente?: string | null) {
  const { inicio, fin } = rangoMes(anio, mes);
  const sumas = await prisma.captura.groupBy({
    by: ["inspeccionId"],
    where: {
      creadoEn: { gte: inicio, lt: fin },
      ...(cliente !== undefined ? { inspeccion: { cliente } } : {}),
    },
    _sum: { buenas: true, malas: true },
  });

  const inspecciones = await prisma.inspeccion.findMany({
    where: { id: { in: sumas.map((s) => s.inspeccionId) } },
    select: { id: true, nombre: true, numeroParte: true, planta: true, cliente: true, precioPorPieza: true },
  });
  const porId = new Map(inspecciones.map((i) => [i.id, i]));

  const clientes = new Map<string, { cliente: string; piezas: number; importe: number; lineas: LineaFactura[] }>();
  for (const s of sumas) {
    const i = porId.get(s.inspeccionId);
    if (!i) continue;
    const piezas = (s._sum.buenas ?? 0) + (s._sum.malas ?? 0);
    const nombreCliente = i.cliente ?? "Sin cliente";
    const grupo = clientes.get(nombreCliente) ?? { cliente: nombreCliente, piezas: 0, importe: 0, lineas: [] };
    const importe = piezas * i.precioPorPieza;
    grupo.piezas += piezas;
    grupo.importe += importe;
    grupo.lineas.push({
      id: i.id,
      nombre: i.nombre,
      numeroParte: i.numeroParte,
      planta: i.planta,
      piezas,
      precio: i.precioPorPieza,
      importe,
    });
    clientes.set(nombreCliente, grupo);
  }

  const lista = Array.from(clientes.values())
    .map((c) => ({ ...c, lineas: c.lineas.sort((a, b) => b.importe - a.importe) }))
    .sort((a, b) => b.importe - a.importe);

  return {
    inicio,
    fin,
    clientes: lista,
    piezas: lista.reduce((acc, c) => acc + c.piezas, 0),
    subtotal: lista.reduce((acc, c) => acc + c.importe, 0),
    sinPrecio: lista.flatMap((c) => c.lineas.filter((l) => l.precio === 0 && l.piezas > 0)),
  };
}
