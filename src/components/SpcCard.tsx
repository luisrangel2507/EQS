"use client";

import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import type { Pronostico, Subgrupo } from "@/lib/spc";

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

export function textoDuracion(horas: number) {
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 48) return `${horas.toFixed(1)} h`;
  return `${(horas / 24).toFixed(1)} días`;
}

export function PronosticoBadge({ p }: { p: Pronostico }) {
  const estilos: Record<Pronostico["estado"], { texto: string; clase: string } | null> = {
    sin_meta: null,
    sin_ritmo: { texto: "⏳ Sin ritmo todavía", clase: "bg-navy-100 text-navy-600" },
    terminada: { texto: "🏁 Meta alcanzada", clase: "bg-green-100 text-green-800" },
    a_tiempo: { texto: "✅ A tiempo", clase: "bg-green-100 text-green-800" },
    en_riesgo: { texto: "⚠️ En riesgo", clase: "bg-red-100 text-red-800" },
    sin_fecha: { texto: "📅 Sin fecha de entrega", clase: "bg-navy-100 text-navy-600" },
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
  const s = payload?.[0]?.payload;
  if (!active || !s) return null;
  return (
    <div className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-navy-900">
        {new Date(s.inicio).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })} · {s.etiqueta} h
      </p>
      <p className="text-navy-600">
        {s.malas} NG de {s.n} pzas → <strong>{pct(s.p)}</strong>
      </p>
      <p className="text-navy-400">Límite superior {pct(s.lcs)}</p>
      {s.fuera && <p className="mt-1 font-semibold text-red-700">⚠️ Fuera de control</p>}
      {!s.fuera && s.tendencia && <p className="mt-1 font-semibold text-red-700">⚠️ 8+ horas seguidas arriba de la media</p>}
    </div>
  );
}

export default function SpcCard({ inspeccionId }: { inspeccionId: string }) {
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
          <h2 className="font-display font-semibold text-navy-900">📉 Control estadístico (gráfica p por hora)</h2>
          {subgrupos.length >= MIN_SUBGRUPOS &&
            (datos.fueraDeControl > 0 || datos.tendencia ? (
              <span className="badge animate-respirar bg-red-100 text-red-800">
                ⚠️ {datos.fueraDeControl > 0 ? `${datos.fueraDeControl} hora(s) fuera de control` : "Tendencia al alza"}
              </span>
            ) : (
              <span className="badge bg-green-100 text-green-800">✅ Proceso en control</span>
            ))}
        </div>
        <p className="mb-3 text-xs text-navy-400">
          % defectuoso de cada hora contra la media del lote ({pct(pBarra, 2)}) y sus límites de 3σ.
        </p>

        {subgrupos.length < MIN_SUBGRUPOS ? (
          <p className="py-10 text-center text-sm text-navy-400">
            Se necesitan al menos {MIN_SUBGRUPOS} horas con capturas para trazar la gráfica ({subgrupos.length} por ahora).
          </p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-4 text-xs text-navy-600">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 rounded" style={{ background: COLOR_P }} /> % defectuoso
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 border-t-2 border-dashed" style={{ borderColor: COLOR_LIMITE }} /> Límites de control
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 border-t-2" style={{ borderColor: COLOR_LIMITE }} /> Media
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_FUERA }} /> Fuera de control
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
          <h2 className="font-display font-semibold text-navy-900">⏱️ Fecha estimada</h2>
          <PronosticoBadge p={p} />
        </div>
        {p.estado === "sin_meta" ? (
          <p className="text-sm text-navy-400">Define una meta de piezas para estimar cuándo termina.</p>
        ) : p.estado === "terminada" ? (
          <p className="font-display text-2xl font-bold text-green-700">Meta alcanzada 🎉</p>
        ) : p.estado === "sin_ritmo" || !p.eta || p.horas === null ? (
          <p className="text-sm text-navy-400">Aún no hay capturas para calcular el ritmo.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-navy-500">Termina aprox.</p>
              <p className="font-display text-2xl font-extrabold text-navy-900">
                {new Date(p.eta).toLocaleString("es-MX", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-navy-50 py-2">
                <p className="font-display text-lg font-bold text-navy-900">{p.restante.toLocaleString("es-MX")}</p>
                <p className="text-[11px] uppercase tracking-wide text-navy-500">pzas faltan</p>
              </div>
              <div className="rounded-lg bg-navy-50 py-2">
                <p className="font-display text-lg font-bold text-navy-900">{textoDuracion(p.horas)}</p>
                <p className="text-[11px] uppercase tracking-wide text-navy-500">a {p.ritmo.toFixed(0)} pzas/h</p>
              </div>
            </div>
            <p className="text-xs text-navy-400">
              Con el ritmo de las últimas 4 horas y trabajando de corrido.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
