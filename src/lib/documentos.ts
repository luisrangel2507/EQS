import type { Rol } from "@prisma/client";

export const TIPOS_DOCUMENTO: [string, string, string][] = [
  ["instruccion", "Instrucción de trabajo", "Work instruction"],
  ["procedimiento", "Procedimiento", "Procedure"],
  ["plan_control", "Plan de control", "Control plan"],
  ["formato", "Formato", "Form"],
  ["otro", "Otro", "Other"],
];

export const puedeCrearDocumentos = (rol: Rol) => rol === "ADMIN" || rol === "SUPERVISOR";
export const puedeAprobarDocumentos = (rol: Rol) => rol === "ADMIN" || rol === "SUPERVISOR" || rol === "GERENTE";
export const puedeVerDocumentos = (rol: Rol) => rol !== "CLIENTE";
export const verBorradores = (rol: Rol) => rol === "ADMIN" || rol === "SUPERVISOR" || rol === "GERENTE" || rol === "LIDER";
