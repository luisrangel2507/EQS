import { prisma } from "@/lib/prisma";

// una jornada abierta más de esto se considera olvidada
export const HORAS_MAXIMAS_JORNADA = 14;

/** Cierra jornadas olvidadas con la hora de la última captura del inspector (o 1 min si no hubo). */
export async function cerrarOlvidadas(usuarioId?: string) {
  const limite = new Date(Date.now() - HORAS_MAXIMAS_JORNADA * 3600000);
  const olvidadas = await prisma.registroAsistencia.findMany({
    where: { salida: null, entrada: { lt: limite }, ...(usuarioId ? { usuarioId } : {}) },
  });
  for (const r of olvidadas) {
    const tope = new Date(r.entrada.getTime() + HORAS_MAXIMAS_JORNADA * 3600000);
    const ultima = await prisma.captura.findFirst({
      where: { usuarioId: r.usuarioId, creadoEn: { gte: r.entrada, lte: tope } },
      orderBy: { creadoEn: "desc" },
      select: { creadoEn: true },
    });
    await prisma.registroAsistencia.update({
      where: { id: r.id },
      data: { salida: ultima?.creadoEn ?? new Date(r.entrada.getTime() + 60000), cerradaAuto: true },
    });
  }
}

export async function jornadaAbierta(usuarioId: string) {
  await cerrarOlvidadas(usuarioId);
  return prisma.registroAsistencia.findFirst({
    where: { usuarioId, salida: null },
    orderBy: { entrada: "desc" },
    include: { inspeccion: { select: { id: true, nombre: true, numeroParte: true, cliente: true } } },
  });
}

export async function marcarEntrada(usuarioId: string, inspeccionId: string, automatica = false) {
  const ahora = new Date();
  await prisma.registroAsistencia.updateMany({ where: { usuarioId, salida: null }, data: { salida: ahora } });
  return prisma.registroAsistencia.create({ data: { usuarioId, inspeccionId, entrada: ahora, automatica } });
}

export async function marcarSalida(usuarioId: string) {
  return prisma.registroAsistencia.updateMany({ where: { usuarioId, salida: null }, data: { salida: new Date() } });
}

/** Si el inspector captura sin jornada abierta (o en otra pieza), se la abre aquí. */
export async function asegurarJornada(usuarioId: string, inspeccionId: string) {
  const abierta = await jornadaAbierta(usuarioId);
  if (abierta?.inspeccionId === inspeccionId) return;
  await marcarEntrada(usuarioId, inspeccionId, true);
}

/** Horas que caen dentro de [inicio, fin); las jornadas abiertas cuentan hasta ahora. */
export function horasEnRango(r: { entrada: Date; salida: Date | null }, inicio: Date, fin: Date) {
  const desde = Math.max(r.entrada.getTime(), inicio.getTime());
  const hasta = Math.min((r.salida ?? new Date()).getTime(), fin.getTime());
  return Math.max(0, hasta - desde) / 3600000;
}
