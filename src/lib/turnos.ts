// Turnos de piso. Las horas son de reloj local de planta, no del servidor (que corre en UTC).
export const ZONA_HORARIA = process.env.NEXT_PUBLIC_ZONA_HORARIA || "America/Monterrey";

export const TURNOS = [
  { valor: "primero", etiqueta: "1er turno", emoji: "🌅", inicio: 6, fin: 14 },
  { valor: "segundo", etiqueta: "2do turno", emoji: "🌇", inicio: 14, fin: 22 },
  { valor: "tercero", etiqueta: "3er turno", emoji: "🌙", inicio: 22, fin: 6 },
] as const;

export type TurnoValor = (typeof TURNOS)[number]["valor"];

function partesLocales(fecha: Date) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return { anio: valor("year"), mes: valor("month"), dia: valor("day"), hora: valor("hour"), minuto: valor("minute") };
}

/** Convierte una hora de reloj local de planta al instante real (Date). */
export function fechaLocal(anio: number, mes: number, dia: number, hora: number) {
  const supuesta = Date.UTC(anio, mes - 1, dia, hora);
  const p = partesLocales(new Date(supuesta));
  const comoLocal = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto);
  return new Date(supuesta - (comoLocal - supuesta));
}

export function turnoEn(fecha = new Date()) {
  const { anio, mes, dia, hora } = partesLocales(fecha);
  const turno = TURNOS.find((t) =>
    t.inicio < t.fin ? hora >= t.inicio && hora < t.fin : hora >= t.inicio || hora < t.fin
  )!;
  // el 3er turno cruza la medianoche: si ya es madrugada, empezó el día anterior
  const diaInicio = turno.inicio > turno.fin && hora < turno.fin ? dia - 1 : dia;
  const inicio = fechaLocal(anio, mes, diaInicio, turno.inicio);
  const fin = fechaLocal(anio, mes, turno.inicio > turno.fin ? diaInicio + 1 : diaInicio, turno.fin);
  return { turno, inicio, fin };
}

export function etiquetaTurno(valor: string) {
  const t = TURNOS.find((x) => x.valor === valor);
  return t ? `${t.emoji} ${t.etiqueta}` : valor;
}

export function horaLocal(fecha: Date | string) {
  return new Date(fecha).toLocaleTimeString("es-MX", {
    timeZone: ZONA_HORARIA,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Mes calendario en hora local de planta: [inicio, fin). mes va de 1 a 12. */
export function rangoMes(anio: number, mes: number) {
  return { inicio: fechaLocal(anio, mes, 1, 0), fin: fechaLocal(anio, mes + 1, 1, 0) };
}

export function mesActualLocal() {
  const { anio, mes } = partesLocales(new Date());
  return { anio, mes };
}
