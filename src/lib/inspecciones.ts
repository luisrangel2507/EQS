import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SesionUsuario } from "@/lib/permissions";

/** Restringe qué inspecciones puede ver cada rol. */
export function whereInspeccionesVisibles(user: SesionUsuario): Prisma.InspeccionWhereInput {
  if (user.rol === "ADMIN" || user.rol === "SUPERVISOR" || user.rol === "LIDER") {
    return {};
  }
  if (user.rol === "INSPECTOR") {
    return { inspectores: { some: { usuarioId: user.id } } };
  }
  if (user.rol === "RESIDENTE") {
    // Residente: solo lectura de inspecciones en la planta donde está asignado
    return { planta: user.plantaResidente ?? "__nunca__" };
  }
  // CLIENTE: solo lectura de inspecciones donde "cliente" coincide con su registro
  return { cliente: user.clienteNombre ?? "__nunca__" };
}

export async function obtenerInspeccionVisible(user: SesionUsuario, inspeccionId: string) {
  return prisma.inspeccion.findFirst({
    where: { id: inspeccionId, ...whereInspeccionesVisibles(user) },
    include: {
      inspectores: { include: { usuario: { select: { id: true, nombre: true } } } },
      defectos: { orderBy: { cantidad: "desc" } },
    },
  });
}
