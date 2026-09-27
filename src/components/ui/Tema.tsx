"use client";

import { useEffect, useState } from "react";
import { CLAVE_TEMA } from "@/lib/tema";

export function BotonTema() {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const nuevo = !oscuro;
    setOscuro(nuevo);
    document.documentElement.classList.toggle("dark", nuevo);
    try {
      localStorage.setItem(CLAVE_TEMA, nuevo ? "oscuro" : "claro");
    } catch {
      // sin localStorage el tema solo dura esta sesión
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="block w-full px-4 py-2 text-left text-sm font-semibold text-navy-700 hover:bg-navy-50"
    >
      {oscuro ? "☀️ Modo claro" : "🌙 Modo oscuro"}
    </button>
  );
}
