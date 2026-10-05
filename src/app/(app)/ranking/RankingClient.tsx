"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import { TURNOS } from "@/lib/turnos";
import NumeroAnimado from "@/components/ui/NumeroAnimado";
import { SkeletonPagina } from "@/components/ui/Skeleton";

type Inspector = {
  id: string;
  nombre: string;
  piezas: number;
  ritmo: number;
  horas: number;
  diasActivos: number;
  racha: number;
  evidencia: number | null;
  esYo: boolean;
};

type Datos = {
  periodo: string;
  inspectores: Inspector[];
  porTurno: { turno: string; piezas: number }[];
};

const PERIODOS = [
  { valor: "hoy", etiqueta: "Hoy" },
  { valor: "semana", etiqueta: "7 días" },
  { valor: "mes", etiqueta: "Mes" },
];

const METRICAS = [
  { valor: "piezas", etiqueta: "Volumen", unidad: "pzas" },
  { valor: "ritmo", etiqueta: "Ritmo", unidad: "pzas/h" },
] as const;

type Metrica = (typeof METRICAS)[number]["valor"];

// con menos de 1 h trabajada el ritmo no es representativo (una sola captura grande lo dispara)
const HORAS_MIN_RITMO = 1;

const iniciales = (n: string) =>
  n
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

function Segmentado<T extends string>({
  id,
  opciones,
  valor,
  onCambiar,
}: {
  id: string;
  opciones: readonly { valor: T; etiqueta: string }[];
  valor: T;
  onCambiar: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-navy-200 bg-white p-1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          onClick={() => onCambiar(o.valor)}
          className={`relative rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            valor === o.valor ? "text-white" : "text-navy-500 hover:text-navy-800"
          }`}
        >
          {valor === o.valor && (
            <motion.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 rounded-full bg-navy"
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
            />
          )}
          <span className="relative">{o.etiqueta}</span>
        </button>
      ))}
    </div>
  );
}

export default function RankingClient() {
  const [periodo, setPeriodo] = useState("semana");
  const [metrica, setMetrica] = useState<Metrica>("piezas");
  const { datos, cargando, actualizando } = usePolling<Datos>(`/api/ranking?periodo=${periodo}`, 30000);

  if (cargando && !datos) return <SkeletonPagina />;
  if (!datos) return null;

  const unidad = METRICAS.find((m) => m.valor === metrica)!.unidad;
  const elegibles =
    metrica === "ritmo" ? datos.inspectores.filter((i) => i.horas >= HORAS_MIN_RITMO) : datos.inspectores;
  const orden = [...elegibles].sort((a, b) => b[metrica] - a[metrica]);
  const max = Math.max(1, ...orden.map((i) => i[metrica]));
  const podio = orden.slice(0, 3);
  const resto = orden.slice(3);
  const maxTurno = Math.max(1, ...datos.porTurno.map((t) => t.piezas));
  const yo = orden.findIndex((i) => i.esYo);
  const formato = (n: number) => (metrica === "ritmo" ? n.toFixed(1) : Math.round(n).toLocaleString("es-MX"));

  return (
    <div className="carga-suave space-y-6" aria-busy={actualizando}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Ranking</h1>
          <p className="text-sm text-navy-500">
            Volumen inspeccionado y ritmo por hora trabajada. {yo >= 0 && <strong>Vas en el lugar #{yo + 1}.</strong>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmentado id="periodo" opciones={PERIODOS} valor={periodo} onCambiar={setPeriodo} />
          <Segmentado id="metrica" opciones={METRICAS} valor={metrica} onCambiar={setMetrica} />
        </div>
      </div>

      {orden.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm text-navy-500">
            {metrica === "ritmo"
              ? "Nadie lleva todavía una hora de trabajo en este periodo."
              : "Sin capturas en este periodo. ¡El primero en capturar se lleva el oro!"}
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 px-4 pb-0 pt-8 shadow-xl">
          <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-yellow/20 blur-3xl" />
          <div className="relative mx-auto flex max-w-2xl items-end justify-center gap-3 sm:gap-6">
            {[1, 0, 2].map((pos) => {
              const i = podio[pos];
              if (!i) return <div key={pos} className="w-1/3 max-w-[180px]" />;
              const alturas = ["h-40", "h-28", "h-20"];
              const medallas = ["1", "2", "3"];
              const colores = [
                "from-yellow to-amber-500 text-navy-900",
                "from-slate-200 to-slate-400 text-navy-900",
                "from-orange-300 to-orange-600 text-white",
              ];
              return (
                <motion.div
                  key={`${periodo}-${metrica}-${i.id}`}
                  className="flex w-1/3 max-w-[180px] flex-col items-center"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + (2 - pos) * 0.12, type: "spring", stiffness: 260, damping: 22 }}
                >
                  <motion.span
                    className="text-3xl"
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.6 + (2 - pos) * 0.12, type: "spring", stiffness: 400, damping: 12 }}
                  >
                    {medallas[pos]}
                  </motion.span>
                  <div
                    className={`mt-1 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br font-display text-lg font-extrabold shadow-lg ring-4 ${
                      i.esYo ? "ring-yellow" : "ring-white/20"
                    } ${colores[pos]}`}
                  >
                    {iniciales(i.nombre)}
                  </div>
                  <p className="mt-2 w-full truncate text-center text-sm font-semibold text-white">
                    {i.nombre}
                    {i.esYo && " (tú)"}
                  </p>
                  <p className="font-display text-xl font-extrabold text-yellow">
                    <NumeroAnimado valor={i[metrica]} formato={formato} />
                    <span className="ml-1 text-[10px] font-semibold uppercase text-white/60">{unidad}</span>
                  </p>
                  <motion.div
                    className={`mt-2 w-full rounded-t-xl bg-gradient-to-b ${colores[pos]} ${alturas[pos]} flex items-start justify-center pt-2 font-display text-2xl font-black opacity-90`}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    style={{ originY: 1 }}
                    transition={{ delay: 0.2 + (2 - pos) * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {pos + 1}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-display font-semibold text-navy-900">Tabla completa</h2>
          {orden.length === 0 ? (
            <p className="text-sm text-navy-400">Sin datos.</p>
          ) : (
            <ol className="space-y-2">
              <AnimatePresence initial={false}>
                {[...podio, ...resto].map((i, idx) => (
                  <motion.li
                    key={i.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(idx, 10) * 0.03 }}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 ${i.esYo ? "bg-yellow-50 ring-1 ring-yellow" : ""}`}
                  >
                    <span className="w-6 text-center font-display font-bold text-navy-400">{idx + 1}</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                      {iniciales(i.nombre)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-navy-900">{i.nombre}</span>
                        {i.esYo && <span className="badge bg-yellow text-navy-900">Tú</span>}
                        {i.racha >= 3 && (
                          <span className="badge bg-orange-100 text-orange-800" title="Días seguidos capturando">
                            {i.racha} días
                          </span>
                        )}
                        {i.evidencia !== null && i.evidencia >= 0.9 && (
                          <span className="badge bg-blue-100 text-blue-800" title="Defectos reportados con foto">
                            Evidencia
                          </span>
                        )}
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy-100">
                        <motion.div
                          className="h-full rounded-full bg-navy-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${(i[metrica] / max) * 100}%` }}
                          transition={{ duration: 0.7, delay: Math.min(idx, 10) * 0.03 }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold tabular-nums text-navy-900">
                        {formato(i[metrica])} <span className="text-xs font-normal text-navy-400">{unidad}</span>
                      </p>
                      <p className="text-[11px] text-navy-400">
                        {metrica === "piezas" ? `${i.ritmo.toFixed(1)} pzas/h` : `${i.piezas.toLocaleString("es-MX")} pzas`}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          )}
          {metrica === "ritmo" && datos.inspectores.length > elegibles.length && (
            <p className="mt-3 text-xs text-navy-400">
              {datos.inspectores.length - elegibles.length} inspector(es) con menos de {HORAS_MIN_RITMO} h trabajada no entran al
              ranking de ritmo.
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-display font-semibold text-navy-900">Por turno</h2>
          <ul className="space-y-3">
            {datos.porTurno.map((t, i) => {
              const info = TURNOS.find((x) => x.valor === t.turno)!;
              return (
                <li key={t.turno}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-navy-800">
                      {info.etiqueta}
                    </span>
                    <span className="font-semibold tabular-nums text-navy-900">
                      {t.piezas.toLocaleString("es-MX")} pzas
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-navy-100">
                    <motion.div
                      className="h-full rounded-full bg-navy-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(t.piezas / maxTurno) * 100}%` }}
                      transition={{ delay: 0.1 + i * 0.08, duration: 0.7 }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 space-y-1.5 rounded-xl bg-navy-50 p-3 text-xs text-navy-600">
            <p className="font-semibold text-navy-800">Insignias</p>
            <p>3 o más días seguidos capturando</p>
            <p>Al menos 90% de los defectos reportados con foto</p>
          </div>
        </div>
      </div>
    </div>
  );
}
