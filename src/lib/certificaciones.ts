import { prisma } from "@/lib/prisma";
import { ErrorPermiso } from "@/lib/permissions";

export type Pregunta = { texto: string; opciones: string[]; correcta: number };

export const CALIFICACION_MINIMA = 80;

export const vigente = (c: { vence: Date | null }) => !c.vence || c.vence.getTime() > Date.now();

export function preguntasDe(valor: unknown): Pregunta[] {
  return Array.isArray(valor) ? (valor as Pregunta[]) : [];
}

/** Para un número de parte: si pide certificación y quiénes la tienen vigente. */
export async function certificadosEn(numeroParte: string | null | undefined) {
  if (!numeroParte) return { requiere: false, certificados: new Set<string>() };
  const criterio = await prisma.criterioParte.findUnique({ where: { numeroParte }, select: { id: true } });
  if (!criterio) return { requiere: false, certificados: new Set<string>() };
  const certs = await prisma.certificacion.findMany({ where: { numeroParte } });
  return { requiere: true, certificados: new Set(certs.filter(vigente).map((c) => c.usuarioId)) };
}

/** Rechaza asignar inspectores sin certificación vigente en un número de parte que la exige. */
export async function validarAsignacion(inspectorIds: string[] | undefined, numeroParte: string | null | undefined) {
  if (!inspectorIds?.length) return;
  const { requiere, certificados } = await certificadosEn(numeroParte);
  if (!requiere) return;
  const faltan = inspectorIds.filter((id) => !certificados.has(id));
  if (faltan.length === 0) return;
  const nombres = await prisma.usuario.findMany({ where: { id: { in: faltan } }, select: { nombre: true } });
  throw new ErrorPermiso(
    `${nombres.map((n) => n.nombre).join(", ")} no ${faltan.length === 1 ? "tiene" : "tienen"} certificación vigente en ${numeroParte}`,
    400
  );
}
