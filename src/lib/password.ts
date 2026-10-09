import { z } from "zod";

export const MIN_CONTRASENA = 10;

const COMUNES = ["password", "contrasena", "contraseña", "12345678", "123456789", "1234567890", "qwerty", "admin123", "inspeccion", "inspeccionapp", "prueba123", "bienvenido"];

/** Política de contraseñas: largo, mezcla de caracteres y que no sea obvia. Devuelve el error o null. */
export function errorContrasena(password: string, usuario?: string): string | null {
  if (password.length < MIN_CONTRASENA) return `La contraseña debe tener al menos ${MIN_CONTRASENA} caracteres`;
  if (password.length > 100) return "La contraseña es demasiado larga";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "La contraseña debe combinar mayúsculas, minúsculas y números";
  }
  const minus = password.toLowerCase();
  if (usuario && usuario.length >= 3 && minus.includes(usuario.toLowerCase())) return "La contraseña no puede contener el nombre de usuario";
  if (COMUNES.some((c) => minus.includes(c))) return "Esa contraseña es demasiado común";
  return null;
}

/** Para zod: valida la política sin conocer aún el usuario. */
export const contrasenaSchema = z.string().superRefine((v, ctx) => {
  const e = errorContrasena(v);
  if (e) ctx.addIssue({ code: z.ZodIssueCode.custom, message: e });
});
