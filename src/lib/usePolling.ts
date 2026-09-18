"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/** Refresca datos desde una URL cada `intervaloMs` (5-10s típico para dashboards en vivo). */
export function usePolling<T>(url: string | null, intervaloMs = 7000) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recargar = useCallback(async () => {
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al cargar datos");
      setDatos(await res.json());
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

  return { datos, cargando, error, recargar };
}
