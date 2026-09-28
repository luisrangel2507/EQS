"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { COOKIE_IDIOMA, crearT, LOCALES, type Idioma, type Traductor } from "@/lib/i18n";

/** Deja fijo el idioma en este navegador (también lo leen el servidor y los PDF). */
export function guardarIdioma(idioma: Idioma) {
  document.cookie = `${COOKIE_IDIOMA}=${idioma}; path=/; max-age=31536000; samesite=lax`;
}

type Valor = { idioma: Idioma; t: Traductor; locale: string; cambiar: (i: Idioma) => void };

const IdiomaContext = createContext<Valor>({
  idioma: "es",
  t: crearT("es"),
  locale: LOCALES.es,
  cambiar: () => {},
});

export function IdiomaProvider({ inicial, children }: { inicial: Idioma; children: React.ReactNode }) {
  const router = useRouter();
  const [idioma, setIdioma] = useState<Idioma>(inicial);
  // el servidor puede resolver otro idioma tras iniciar sesión o un router.refresh()
  useEffect(() => setIdioma(inicial), [inicial]);

  const cambiar = useCallback(
    (nuevo: Idioma) => {
      guardarIdioma(nuevo);
      document.documentElement.lang = nuevo;
      setIdioma(nuevo);
      // las pantallas de servidor (y su metadata) se vuelven a pintar en el nuevo idioma
      router.refresh();
    },
    [router]
  );

  const valor = useMemo(() => ({ idioma, t: crearT(idioma), locale: LOCALES[idioma], cambiar }), [idioma, cambiar]);
  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>;
}

export const useIdioma = () => useContext(IdiomaContext);

/** Interruptor ES | EN. `oscuro` para fondos navy. */
export function BotonIdioma({ oscuro = false, className = "" }: { oscuro?: boolean; className?: string }) {
  const { idioma, cambiar } = useIdioma();
  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      className={`inline-flex rounded-full p-0.5 text-xs font-bold ${oscuro ? "bg-white/10" : "bg-navy-100"} ${className}`}
    >
      {(["es", "en"] as const).map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => idioma !== i && cambiar(i)}
          aria-pressed={idioma === i}
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            idioma === i
              ? oscuro
                ? "bg-white text-navy-900"
                : "bg-navy text-white"
              : oscuro
                ? "text-white/70 hover:text-white"
                : "text-navy-500 hover:text-navy-900"
          }`}
        >
          {i}
        </button>
      ))}
    </div>
  );
}
