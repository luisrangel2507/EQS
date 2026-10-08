"use client";

import { useEffect, useState } from "react";
import { useIdioma } from "@/components/ui/Idioma";
import { CLAVE_TEMA } from "@/lib/tema";

const EVENTO_TEMA = "ia-tema";

export function alternarTema() {
  const oscuro = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", oscuro);
  try {
    localStorage.setItem(CLAVE_TEMA, oscuro ? "oscuro" : "claro");
  } catch {
    // sin localStorage el tema solo dura esta sesión
  }
  window.dispatchEvent(new Event(EVENTO_TEMA));
}

export function BotonTema() {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    const leer = () => setOscuro(document.documentElement.classList.contains("dark"));
    leer();
    window.addEventListener(EVENTO_TEMA, leer);
    return () => window.removeEventListener(EVENTO_TEMA, leer);
  }, []);

  const { t } = useIdioma();
  return (
    <button
      type="button"
      onClick={alternarTema}
      className="block w-full px-4 py-2 text-left text-sm font-semibold text-navy-700 hover:bg-navy-50"
    >
      {oscuro ? `${t("Modo claro", "Light mode")}` : `${t("Modo oscuro", "Dark mode")}`}
    </button>
  );
}
