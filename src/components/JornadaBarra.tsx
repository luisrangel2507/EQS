"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import { useToast } from "@/components/ui/Toast";
import { vibrar } from "@/lib/feedback";

type Estado = {
  abierta: {
    id: string;
    entrada: string;
    inspeccionId: string | null;
    automatica: boolean;
    inspeccion: { id: string; nombre: string; numeroParte: string | null } | null;
  } | null;
  horasHoy: number;
};

export function duracionTexto(ms: number) {
  const min = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(min / 60);
  return h ? `${h} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`;
}

/** Estado de la jornada del inspector; con inspeccionId permite iniciarla en esa pieza. */
export default function JornadaBarra({ inspeccionId, oscuro = false }: { inspeccionId?: string; oscuro?: boolean }) {
  const toast = useToast();
  const { datos, recargar } = usePolling<Estado>("/api/asistencia/mia", 60000);
  const [ahora, setAhora] = useState(() => Date.now());
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  if (!datos) return null;

  async function accion(cuerpo: object, mensaje: string) {
    setEnviando(true);
    const res = await fetch("/api/asistencia/mia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    }).catch(() => null);
    setEnviando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      toast.error(d?.error ?? "Sin conexión; intenta de nuevo");
      return;
    }
    vibrar("exito");
    toast.exito(mensaje);
    recargar();
  }

  const { abierta } = datos;
  const aqui = abierta && (!inspeccionId || abierta.inspeccionId === inspeccionId);
  const enOtra = abierta && inspeccionId && abierta.inspeccionId !== inspeccionId;

  const base = oscuro ? "bg-white/10 text-white" : "border border-navy-100 bg-white text-navy-900 shadow-sm";

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm ${base}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {aqui && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${aqui ? "bg-emerald-500" : enOtra ? "bg-amber-400" : "bg-navy-300"}`}
          />
        </span>
        <span className="min-w-0 truncate font-semibold">
          {aqui
            ? `En jornada · ${duracionTexto(ahora - new Date(abierta!.entrada).getTime())}`
            : enOtra
              ? `Jornada abierta en ${abierta!.inspeccion?.numeroParte ?? abierta!.inspeccion?.nombre ?? "otra pieza"}`
              : "Sin jornada iniciada"}
        </span>
        <span className={`hidden text-xs sm:inline ${oscuro ? "text-white/60" : "text-navy-400"}`}>
          · hoy {datos.horasHoy.toFixed(1)} h
        </span>
      </div>
      <div className="flex gap-2">
        {inspeccionId && !aqui && (
          <button
            disabled={enviando}
            onClick={() => accion({ accion: "entrar", inspeccionId }, enOtra ? "Jornada cambiada a esta pieza" : "Jornada iniciada")}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {enOtra ? "Cambiar aquí" : "▶ Iniciar jornada"}
          </button>
        )}
        {abierta && (
          <button
            disabled={enviando}
            onClick={() => accion({ accion: "salir" }, "Jornada terminada. ¡Buen descanso!")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
              oscuro ? "bg-white/15 text-white" : "bg-navy-100 text-navy-800"
            }`}
          >
            Terminar
          </button>
        )}
      </div>
    </motion.div>
  );
}
