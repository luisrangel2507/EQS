import type { Prisma } from "@prisma/client";
import { esLiderazgo, type SesionUsuario } from "@/lib/permissions";

/** Liderazgo ve todo; Residente, su planta; Cliente, las de su empresa. */
export function whereAuditoriasVisibles(user: SesionUsuario): Prisma.AuditoriaWhereInput {
  if (esLiderazgo(user.rol)) return {};
  if (user.rol === "RESIDENTE") return { OR: [{ planta: user.plantaResidente ?? "__nunca__" }, { auditorId: user.id }] };
  if (user.rol === "CLIENTE") return { cliente: user.clienteNombre ?? "__nunca__", estado: "completada" };
  return { id: "__nunca__" };
}
