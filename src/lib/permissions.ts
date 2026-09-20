import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Rol } from "@prisma/client";

export type SesionUsuario = {
  id: string;
  nombre: string;
  usuario: string;
  rol: Rol;
  clienteNombre: string | null;
};

export class ErrorPermiso extends Error {
  status: number;
  constructor(mensaje: string, status = 403) {
    super(mensaje);
    this.status = status;
  }
}

/** Obtiene la sesión actual o lanza 401. Usar en toda Server Action / API route. */
export async function requerirSesion(): Promise<SesionUsuario> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new ErrorPermiso("No autenticado", 401);
  }
  return session.user;
}

/** Exige que el usuario tenga alguno de los roles indicados. */
export async function requerirRol(...roles: Rol[]): Promise<SesionUsuario> {
  const user = await requerirSesion();
  if (!roles.includes(user.rol)) {
    throw new ErrorPermiso("No tienes permiso para realizar esta acción");
  }
  return user;
}

export const esAdmin = (rol: Rol) => rol === "ADMIN";
export const esSupervisorOAdmin = (rol: Rol) => rol === "ADMIN" || rol === "SUPERVISOR";
export const esInspector = (rol: Rol) => rol === "INSPECTOR";
export const esCliente = (rol: Rol) => rol === "CLIENTE";
/** Admin, Supervisor o Líder: ven todo el piso y el dashboard operativo. */
export const esLiderazgo = (rol: Rol) => rol === "ADMIN" || rol === "SUPERVISOR" || rol === "LIDER";
/** Quién tiene acceso al chat grupal: liderazgo + inspectores (no clientes). */
export const puedeChatear = (rol: Rol) => esLiderazgo(rol) || rol === "INSPECTOR";

/** Envuelve una respuesta de API con manejo estándar de ErrorPermiso. */
export function manejarErrorApi(error: unknown) {
  if (error instanceof ErrorPermiso) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Error interno del servidor" }, { status: 500 });
}
