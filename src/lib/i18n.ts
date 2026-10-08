import { DEFECTOS_EN } from "@/lib/constants";

// Bilingüe español/inglés. Los textos van en línea como t("español", "English")
// para que cada pantalla se lea sola; el idioma vive en una cookie para que las
// pantallas de servidor y los PDF lo respeten también.
export type Idioma = "es" | "en";
export type Traductor = (es: string, en: string) => string;

export const COOKIE_IDIOMA = "ia_idioma";
export const LOCALES: Record<Idioma, string> = { es: "es-MX", en: "en-US" };

export const crearT =
  (idioma: Idioma): Traductor =>
  (es, en) =>
    idioma === "en" ? en : es;

/** La cookie manda; si no hay, en páginas públicas se usa el idioma del navegador. */
export function idiomaDe(cookie?: string | null, acceptLanguage?: string | null): Idioma {
  if (cookie === "es" || cookie === "en") return cookie;
  if (acceptLanguage && /^\s*en\b/i.test(acceptLanguage)) return "en";
  return "es";
}

/** Los defectos del catálogo se traducen; los capturados a mano se dejan como están. */
export const nombreDefecto = (tipo: string, idioma: Idioma) => (idioma === "en" ? (DEFECTOS_EN[tipo] ?? tipo) : tipo);
