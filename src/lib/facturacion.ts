import { prisma } from "@/lib/prisma";
import { rangoMes } from "@/lib/turnos";
import { horasEnRango } from "@/lib/asistencia";

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
  horas: number;
  modo: "pieza" | "hora";
  precio: number;
  importe: number;
};

/** Por inspección: piezas del mes × precio por pieza, u horas trabajadas × precio por hora; agrupado por cliente. */
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

  const registros = await prisma.registroAsistencia.findMany({
    where: {
      entrada: { lt: fin },
      OR: [{ salida: null }, { salida: { gt: inicio } }],
      inspeccion: { modoCobro: "hora", ...(cliente !== undefined ? { cliente } : {}) },
    },
    select: { inspeccionId: true, entrada: true, salida: true },
  });
  const horasPor = new Map<string, number>();
  for (const r of registros) {
    if (!r.inspeccionId) continue;
    horasPor.set(r.inspeccionId, (horasPor.get(r.inspeccionId) ?? 0) + horasEnRango(r, inicio, fin));
  }
  const piezasPor = new Map(sumas.map((s) => [s.inspeccionId, (s._sum.buenas ?? 0) + (s._sum.malas ?? 0)]));

  const inspecciones = await prisma.inspeccion.findMany({
    where: { id: { in: Array.from(new Set([...Array.from(piezasPor.keys()), ...Array.from(horasPor.keys())])) } },
    select: {
      id: true,
      nombre: true,
      numeroParte: true,
      planta: true,
      cliente: true,
      precioPorPieza: true,
      modoCobro: true,
      precioPorHora: true,
    },
  });

  const clientes = new Map<string, { cliente: string; piezas: number; importe: number; lineas: LineaFactura[] }>();
  for (const i of inspecciones) {
    const piezas = piezasPor.get(i.id) ?? 0;
    const horas = horasPor.get(i.id) ?? 0;
    const modo = i.modoCobro === "hora" ? "hora" : "pieza";
    const precio = modo === "hora" ? i.precioPorHora : i.precioPorPieza;
    const nombreCliente = i.cliente ?? "Sin cliente";
    const grupo = clientes.get(nombreCliente) ?? { cliente: nombreCliente, piezas: 0, importe: 0, lineas: [] };
    const importe = (modo === "hora" ? horas : piezas) * precio;
    grupo.piezas += piezas;
    grupo.importe += importe;
    grupo.lineas.push({
      id: i.id,
      nombre: i.nombre,
      numeroParte: i.numeroParte,
      planta: i.planta,
      piezas,
      horas,
      modo,
      precio,
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
    sinPrecio: lista.flatMap((c) =>
      c.lineas.filter((l) => l.precio === 0 && (l.modo === "hora" ? l.horas > 0 : l.piezas > 0))
    ),
  };
}
