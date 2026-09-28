import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { esLiderazgo, type SesionUsuario } from "@/lib/permissions";

// sin 0/O/1/I/L para que se pueda teclear desde la etiqueta si el QR se daña
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generarCodigo(largo = 8) {
  const bytes = randomBytes(largo);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

export const codigoValido = (c: string) => /^[2-9A-HJ-KM-NP-Z]{6,12}$/.test(c);

/** Piezas que ya se pueden liberar: buenas + recuperadas por retrabajo, menos lo ya etiquetado. */
export async function saldoLiberable(inspeccionId: string) {
  const [inspeccion, etiquetado] = await Promise.all([
    prisma.inspeccion.findUniqueOrThrow({
      where: { id: inspeccionId },
      select: { piezasBuenas: true, piezasRetrabajadas: true },
    }),
    prisma.etiquetaLiberacion.aggregate({ where: { inspeccionId, anulada: false }, _sum: { cantidad: true } }),
  ]);
  const liberables = inspeccion.piezasBuenas + inspeccion.piezasRetrabajadas;
  const etiquetadas = etiquetado._sum.cantidad ?? 0;
  return { liberables, etiquetadas, disponibles: Math.max(0, liberables - etiquetadas) };
}

/** Quien ve la inspección y trabaja en piso puede imprimir; el cliente solo consulta. */
export const puedeImprimirEtiquetas = (user: SesionUsuario) =>
  esLiderazgo(user.rol) || user.rol === "RESIDENTE" || user.rol === "INSPECTOR";
