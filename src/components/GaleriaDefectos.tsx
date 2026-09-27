"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type FotoDefecto = {
  id: string;
  url: string;
  defecto: string | null;
  cantidad?: number;
  creadoEn: string;
  autor?: string | null;
};

export default function GaleriaDefectos({ fotos, vacio }: { fotos: FotoDefecto[]; vacio?: string }) {
  const [filtro, setFiltro] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);

  const tipos = useMemo(
    () => Array.from(new Set(fotos.map((f) => f.defecto).filter(Boolean))) as string[],
    [fotos]
  );
  const visibles = filtro ? fotos.filter((f) => f.defecto === filtro) : fotos;
  const actual = abierta !== null ? visibles[abierta] : null;

  useEffect(() => {
    if (abierta === null) return;
    const teclas = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierta(null);
      if (e.key === "ArrowRight") setAbierta((i) => (i === null ? i : Math.min(visibles.length - 1, i + 1)));
      if (e.key === "ArrowLeft") setAbierta((i) => (i === null ? i : Math.max(0, i - 1)));
    };
    window.addEventListener("keydown", teclas);
    return () => window.removeEventListener("keydown", teclas);
  }, [abierta, visibles.length]);

  if (fotos.length === 0) {
    return <p className="text-sm text-navy-400">{vacio ?? "Todavía no hay fotos de evidencia."}</p>;
  }

  return (
    <div>
      {tipos.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[null, ...tipos].map((t) => (
            <button
              key={t ?? "todas"}
              onClick={() => setFiltro(t)}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                filtro === t ? "border-navy bg-navy text-white" : "border-navy-200 bg-white text-navy-600"
              }`}
            >
              {t ?? `Todas (${fotos.length})`}
            </button>
          ))}
        </div>
      )}

      <motion.div layout className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <AnimatePresence mode="popLayout">
          {visibles.map((f, i) => (
            <motion.button
              key={f.id}
              layout
              layoutId={`foto-${f.id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setAbierta(i)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-navy-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.url}
                alt={f.defecto ?? "Evidencia"}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
              />
              {f.defecto && (
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-5 text-left text-[11px] font-semibold text-white">
                  {f.defecto}
                </span>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {actual && abierta !== null && (
          <motion.div
            className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAbierta(null)}
          >
            <motion.img
              layoutId={`foto-${actual.id}`}
              src={actual.url}
              alt={actual.defecto ?? "Evidencia"}
              className="max-h-[78vh] max-w-full rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 text-center text-white" onClick={(e) => e.stopPropagation()}>
              <p className="font-display text-lg font-bold">{actual.defecto ?? "Evidencia"}</p>
              <p className="text-sm text-white/70">
                {new Date(actual.creadoEn).toLocaleString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {actual.cantidad ? ` · ${actual.cantidad} pza${actual.cantidad === 1 ? "" : "s"}` : ""}
                {actual.autor ? ` · ${actual.autor}` : ""}
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button
                  disabled={abierta === 0}
                  onClick={() => setAbierta(abierta - 1)}
                  className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-30"
                >
                  ← Anterior
                </button>
                <span className="self-center text-xs text-white/60">
                  {abierta + 1} / {visibles.length}
                </span>
                <button
                  disabled={abierta === visibles.length - 1}
                  onClick={() => setAbierta(abierta + 1)}
                  className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-30"
                >
                  Siguiente →
                </button>
              </div>
            </div>
            <button
              className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-white"
              onClick={() => setAbierta(null)}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
