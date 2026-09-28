import { cookies, headers } from "next/headers";
import { COOKIE_IDIOMA, crearT, idiomaDe, LOCALES, type Idioma } from "@/lib/i18n";

const COOKIES_SESION = ["next-auth.session-token", "__Secure-next-auth.session-token"];

/**
 * Idioma para pantallas y rutas de servidor. Si el usuario ya eligió, manda su
 * cookie. Si no: visitantes sin sesión (landing, portal público, QR de
 * etiquetas) ven el idioma de su navegador; dentro de la app el default es español.
 */
export function idiomaServidor(): Idioma {
  const almacen = cookies();
  const conSesion = COOKIES_SESION.some((c) => almacen.has(c));
  return idiomaDe(almacen.get(COOKIE_IDIOMA)?.value, conSesion ? null : headers().get("accept-language"));
}

export function traductorServidor() {
  const idioma = idiomaServidor();
  return { idioma, t: crearT(idioma), locale: LOCALES[idioma] };
}
