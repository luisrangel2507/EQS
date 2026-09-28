"use client";

import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import type { Pronostico, Subgrupo } from "@/lib/spc";
import { useIdioma } from "@/components/ui/Idioma";
import { crearT, type Traductor } from "@/lib/i18n";

type Datos = {
  subgrupos: Subgrupo[];
  pBarra: number;
  fueraDeControl: number;
  tendencia: boolean;
  pronostico: Pronostico;
};

const COLOR_P = "#3A50A8";
const COLOR_LIMITE = "#8A94B8";
const COLOR_FUERA = "#DC2626";
const MIN_SUBGRUPOS = 3;

const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

export function textoDuracion(horas: number, t: Traductor = crearT("es")) {
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 48) return `${horas.toFixed(1)} h`;
  return `${(horas / 24).toFixed(1)} ${t("días", "days")}`;
}

export function PronosticoBadge({ p }: { p: Pronostico }) {
  const { t } = useIdioma();
  const estilos: Record<Pronostico["estado"], { texto: string; clase: string } | null> = {
    sin_meta: null,
    sin_ritmo: { texto: `⏳ ${t("Sin ritmo todavía", "No pace yet")}`, clase: "bg-navy-100 text-navy-600" },
    terminada: { texto: `🏁 ${t("Meta alcanzada", "Goal reached")}`, clase: "bg-green-100 text-green-800" },
    a_tiempo: { texto: `✅ ${t("A tiempo", "On time")}`, clase: "bg-green-100 text-green-800" },
    en_riesgo: { texto: `⚠️ ${t("En riesgo", "At risk")}`, clase: "bg-red-100 text-red-800" },
    sin_fecha: { texto: `📅 ${t("Sin fecha de entrega", "No due date")}`, clase: "bg-navy-100 text-navy-600" },
  };
  const e = estilos[p.estado];
  return e ? <span className={`badge ${e.clase}`}>{e.texto}</span> : null;
}

function Punto(props: { cx?: number; cy?: number; payload?: Subgrupo }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  const alerta = payload.fuera || payload.tendencia;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={alerta ? 6 : 4}
      fill={alerta ? COLOR_FUERA : COLOR_P}
      stroke="var(--background)"
      strokeWidth={2}
    />
  );
}

function Detalle({ active, payload }: { active?: boolean; payload?: { payload: Subgrupo }[] }) {
  const { t, locale } = useIdioma();
  const s = payload?.[0]?.payload;
  if (!active || !s) return null;
  return (
    <div className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-navy-900">
        {new Date(s.inicio).toLocaleDateString(locale, { day: "2-digit", month: "short" })} · {s.etiqueta} h
      </p>
      <p className="text-navy-600">
        {s.malas} NG {t("de", "of")} {s.n} {t("pzas", "pcs")} → <strong>{pct(s.p)}</strong>
      </p>
      <p className="text-navy-400">
        {t("Límite superior", "Upper limit")} {pct(s.lcs)}
      </p>
      {s.fuera && <p className="mt-1 font-semibold text-red-700">⚠️ {t("Fuera de control", "Out of control")}</p>}
      {!s.fuera && s.tendencia && (
        <p className="mt-1 font-semibold text-red-700">
          ⚠️ {t("8+ horas seguidas arriba de la media", "8+ hours in a row above the mean")}
        </p>
      )}
    </div>
  );
}

export default function SpcCard({ inspeccionId }: { inspeccionId: string }) {
  const { t, locale } = useIdioma();
  const { datos } = usePolling<Datos>(`/api/inspecciones/${inspeccionId}/spc`, 30000);

  if (!datos) return <div className="card"><div className="skeleton h-64 rounded-lg" /></div>;

  const { subgrupos, pBarra, pronostico: p } = datos;
  const tope = Math.max(0.05, ...subgrupos.map((s) => Math.max(s.p, s.lcs))) * 1.08;
  const paso = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25].find((x) => tope / x <= 5) ?? 0.25;
  const maxY = Math.ceil(tope / paso) * paso;
  const marcas = Array.from({ length: Math.round(maxY / paso) + 1 }, (_, i) => Number((i * paso).toFixed(4)));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card lg:col-span-2">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display font-semibold text-navy-900">
            📉 {t("Control estadístico (gráfica p por hora)", "Statistical control (hourly p-chart)")}
          </h2>
          {subgrupos.length >= MIN_SUBGRUPOS &&
            (datos.fueraDeControl > 0 || datos.tendencia ? (
              <span className="badge animate-respirar bg-red-100 text-red-800">
                ⚠️{" "}
                {datos.fueraDeControl > 0
                  ? t(`${datos.fueraDeControl} hora(s) fuera de control`, `${datos.fueraDeControl} hour(s) out of control`)
                  : t("Tendencia al alza", "Upward trend")}
              </span>
            ) : (
              <span className="badge bg-green-100 text-green-800">✅ {t("Proceso en control", "Process in control")}</span>
            ))}
        </div>
        <p className="mb-3 text-xs text-navy-400">
          {t(
            `% defectuoso de cada hora contra la media del lote (${pct(pBarra, 2)}) y sus límites de 3σ.`,
            `Hourly % defective vs. the lot mean (${pct(pBarra, 2)}) and its 3σ limits.`
          )}
        </p>

        {subgrupos.length < MIN_SUBGRUPOS ? (
          <p className="py-10 text-center text-sm text-navy-400">
            {t(
              `Se necesitan al menos ${MIN_SUBGRUPOS} horas con capturas para trazar la gráfica (${subgrupos.length} por ahora).`,
              `At least ${MIN_SUBGRUPOS} hours of data are needed to plot the chart (${subgrupos.length} so far).`
            )}
          </p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-4 text-xs text-navy-600">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 rounded" style={{ background: COLOR_P }} /> {t("% defectuoso", "% defective")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 border-t-2 border-dashed" style={{ borderColor: COLOR_LIMITE }} /> {t("Límites de control", "Control limits")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 border-t-2" style={{ borderColor: COLOR_LIMITE }} /> {t("Media", "Mean")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_FUERA }} /> {t("Fuera de control", "Out of control")}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={subgrupos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E3E7F3" />
                <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#5D74C7" }} minTickGap={16} />
                <YAxis
                  domain={[0, maxY]}
                  ticks={marcas}
                  tickFormatter={(v) => pct(Number(v), 0)}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fontSize: 11, fill: "#5D74C7" }}
                />
                <Tooltip content={<Detalle />} />
                <ReferenceLine y={pBarra} stroke={COLOR_LIMITE} strokeWidth={1.5} />
                <Line type="stepAfter" dataKey="lcs" stroke={COLOR_LIMITE} strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} isAnimationActive={false} />
                <Line type="stepAfter" dataKey="lci" stroke={COLOR_LIMITE} strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} isAnimationActive={false} />
                <Line type="linear" dataKey="p" stroke={COLOR_P} strokeWidth={2} dot={<Punto />} activeDot={<Punto />} />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card flex flex-col"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display font-semibold text-navy-900">⏱️ {t("Fecha estimada", "Estimated finish")}</h2>
          <PronosticoBadge p={p} />
        </div>
        {p.estado === "sin_meta" ? (
          <p className="text-sm text-navy-400">
            {t("Define una meta de piezas para estimar cuándo termina.", "Set a parts goal to estimate when it finishes.")}
          </p>
        ) : p.estado === "terminada" ? (
          <p className="font-display text-2xl font-bold text-green-700">{t("Meta alcanzada", "Goal reached")} 🎉</p>
        ) : p.estado === "sin_ritmo" || !p.eta || p.horas === null ? (
          <p className="text-sm text-navy-400">{t("Aún no hay capturas para calcular el ritmo.", "No entries yet to compute the pace.")}</p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-navy-500">{t("Termina aprox.", "Finishes approx.")}</p>
              <p className="font-display text-2xl font-extrabold text-navy-900">
                {new Date(p.eta).toLocaleString(locale, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-navy-50 py-2">
                <p className="font-display text-lg font-bold text-navy-900">{p.restante.toLocaleString(locale)}</p>
                <p className="text-[11px] uppercase tracking-wide text-navy-500">{t("pzas faltan", "pcs left")}</p>
              </div>
              <div className="rounded-lg bg-navy-50 py-2">
                <p className="font-display text-lg font-bold text-navy-900">{textoDuracion(p.horas, t)}</p>
                <p className="text-[11px] uppercase tracking-wide text-navy-500">
                  {t("a", "at")} {p.ritmo.toFixed(0)} {t("pzas/h", "pcs/h")}
                </p>
              </div>
            </div>
            <p className="text-xs text-navy-400">
              {t("Con el ritmo de las últimas 4 horas y trabajando de corrido.", "Based on the last 4 hours' pace, working continuously.")}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
