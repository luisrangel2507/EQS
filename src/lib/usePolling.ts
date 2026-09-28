"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/** Refresca datos desde una URL cada `intervaloMs` (5-10s típico para dashboards en vivo). */
export function usePolling<T>(url: string | null, intervaloMs = 7000) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  // URL de la que vienen los datos mostrados: si cambió (otro periodo/pestaña) aún no llegan los nuevos
  const [urlDatos, setUrlDatos] = useState<string | null>(null);
  const urlActual = useRef(url);
  urlActual.current = url;
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recargar = useCallback(async () => {
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al cargar datos");
      const json = await res.json();
      // una respuesta tardía de la pestaña anterior no debe pisar la actual
      if (urlActual.current !== url) return;
      setDatos(json);
      setUrlDatos(url);
      setError(null);
    } catch {
      setError("No se pudo actualizar la información");
    } finally {
      setCargando(false);
    }
  }, [url]);

  useEffect(() => {
    if (!url) return;
    recargar();
    timerRef.current = setInterval(recargar, intervaloMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [url, intervaloMs, recargar]);

  const actualizando = Boolean(url) && datos !== null && urlDatos !== url;
  return { datos, cargando, error, recargar, actualizando };
}
