import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { ErrorPermiso } from "@/lib/permissions";
import { prismaGlobal } from "@/lib/prisma";
import { NOMBRE_EMPRESA, NOMBRE_LEGAL } from "@/lib/branding";

/** La organización dueña de la instalación (la primera); se crea si la base está vacía. */
export async function organizacionPrincipal() {
  const existente = await prismaGlobal.organizacion.findFirst({ orderBy: { creadoEn: "asc" } });
  return existente ?? prismaGlobal.organizacion.create({ data: { nombre: NOMBRE_LEGAL, nombreCorto: NOMBRE_EMPRESA } });
}

/** Nombre de la organización para reportes y páginas públicas. */
export async function datosOrganizacion(id: string) {
  const org = await prismaGlobal.organizacion.findUnique({ where: { id }, select: { nombre: true, nombreCorto: true } });
  return org ?? { nombre: NOMBRE_LEGAL, nombreCorto: NOMBRE_EMPRESA };
}

export const registroAbierto = () => process.env.REGISTRO_ABIERTO === "1";

const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function contrasenaTemporal() {
  const bloque = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${bloque()}-${bloque()}-${bloque()}`;
}

export const normalizarUsuario = (u: string) => u.trim().toLowerCase();

/** Da de alta una organización nueva con su primer Administrador. */
export async function crearOrganizacion(datos: {
  nombre: string;
  nombreCorto: string;
  admin: { nombre: string; usuario: string; password: string };
}) {
  const usuario = normalizarUsuario(datos.admin.usuario);
  if (await prismaGlobal.usuario.findUnique({ where: { usuario } })) {
    throw new ErrorPermiso("Ese nombre de usuario ya está en uso, elige otro", 409);
  }
  const passwordHash = await bcrypt.hash(datos.admin.password, 10);
  return prismaGlobal.organizacion.create({
    data: {
      nombre: datos.nombre,
      nombreCorto: datos.nombreCorto,
      usuarios: { create: { nombre: datos.admin.nombre, usuario, passwordHash, rol: "ADMIN" } },
    },
    include: { usuarios: { select: { id: true, usuario: true } } },
  });
}
