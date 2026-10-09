import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ErrorPermiso, type SesionUsuario } from "@/lib/permissions";

/*
 * Bitácora de cambios (trazabilidad de registros). Solo se inserta: la tabla
 * tiene un trigger que impide modificarla y ninguna ruta la borra.
 */

export type EntradaBitacora = {
  accion: "CREAR" | "EDITAR" | "ANULAR" | "ELIMINAR" | "CERRAR" | "REABRIR" | "ACTIVAR" | "DESACTIVAR" | "BLOQUEAR" | "COMPLETAR";
  entidad: "Inspeccion" | "Captura" | "Auditoria" | "Reporte8D" | "Asistencia" | "Usuario" | "Criterio" | "Enlace";
  entidadId: string;
  resumen: string;
  antes?: unknown;
  despues?: unknown;
  motivo?: string | null;
};

const json = (v: unknown) =>
  v === undefined || v === null ? Prisma.JsonNull : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);

function ipDePeticion() {
  try {
    return headers().get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  } catch {
    return null;
  }
}

/** Fila de bitácora lista para meter en un $transaction junto con el cambio. */
export function filaBitacora(user: SesionUsuario, e: EntradaBitacora) {
  return prisma.bitacoraCambio.create({
    data: {
      organizacionId: user.organizacionId,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      usuarioRol: user.rol,
      accion: e.accion,
      entidad: e.entidad,
      entidadId: e.entidadId,
      resumen: e.resumen.slice(0, 300),
      antes: json(e.antes),
      despues: json(e.despues),
      motivo: e.motivo ?? null,
      ip: ipDePeticion(),
    },
  });
}

/** Registra un cambio ya hecho. Un fallo al escribir la bitácora no tumba la operación, pero queda en el log del servidor. */
export async function registrar(user: SesionUsuario, e: EntradaBitacora) {
  try {
    await filaBitacora(user, e);
  } catch (error) {
    console.error("No se pudo escribir en la bitácora", error);
  }
}

/** Motivo obligatorio de una anulación: viene en el cuerpo JSON de la petición DELETE. */
export async function leerMotivo(req: NextRequest, minimo = 5): Promise<string> {
  const cuerpo = (await req.json().catch(() => ({}))) as { motivo?: unknown };
  const motivo = typeof cuerpo.motivo === "string" ? cuerpo.motivo.trim() : "";
  if (motivo.length < minimo) {
    throw new ErrorPermiso(`Escribe el motivo de la anulación (mínimo ${minimo} caracteres)`, 400);
  }
  return motivo.slice(0, 500);
}

/** Campos que se escriben al anular un registro. */
export const datosAnulacion = (user: SesionUsuario, motivo: string) => ({
  anuladoEn: new Date(),
  anuladoPorId: user.id,
  motivoAnulacion: motivo,
});
