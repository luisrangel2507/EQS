"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePolling } from "@/lib/usePolling";
import { Kpi, formatoMoneda } from "@/app/(app)/dashboard/shared";
import { SkeletonPagina } from "@/components/ui/Skeleton";

type Linea = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  planta: string | null;
  piezas: number;
  precio: number;
  importe: number;
};

type Datos = {
  mes: string;
  tasaIva: number;
  subtotal: number;
  piezas: number;
  clientes: { cliente: string; piezas: number; importe: number; lineas: Linea[] }[];
  sinPrecio: Linea[];
  historico: { mes: string; subtotal: number; piezas: number }[];
};

function mesHoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function moverMes(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nombreMes(mes: string, corto = false) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString("es-MX", {
    month: corto ? "short" : "long",
    year: corto ? "2-digit" : "numeric",
    timeZone: "UTC",
  });
}

const precioExacto = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const monedaCorta = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}k` : `$${n.toFixed(0)}`;

export default function FacturacionClient() {
  const [mes, setMes] = useState(mesHoy);
  const { datos, cargando } = usePolling<Datos>(`/api/facturacion?mes=${mes}`, 60000);
  const [abierto, setAbierto] = useState<string | null>(null);

  if (cargando && !datos) return <SkeletonPagina />;
  if (!datos) return null;

  const iva = datos.subtotal * datos.tasaIva;
  const esMesActual = mes === mesHoy();
  const historico = datos.historico.map((h) => ({ ...h, etiqueta: nombreMes(h.mes, true) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">💰 Facturación</h1>
          <p className="text-sm text-navy-500">Piezas inspeccionadas en el mes × precio por pieza de cada inspección.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary px-3" onClick={() => setMes(moverMes(mes, -1))} aria-label="Mes anterior">
            ←
          </button>
          <span className="min-w-[10rem] text-center font-display font-semibold text-navy-900">
            {nombreMes(mes).replace(/^./, (l) => l.toUpperCase())}
          </span>
          <button
            className="btn-secondary px-3"
            onClick={() => setMes(moverMes(mes, 1))}
            disabled={esMesActual}
            aria-label="Mes siguiente"
          >
            →
          </button>
          <a className="btn-secondary" href={`/api/facturacion/csv?mes=${mes}`}>
            ⬇️ CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi etiqueta="Subtotal" valor={datos.subtotal} formato={formatoMoneda} />
        <Kpi
          etiqueta={`Total con IVA (${(datos.tasaIva * 100).toFixed(0)}%)`}
          valor={datos.subtotal + iva}
          formato={formatoMoneda}
          indice={1}
        />
        <Kpi etiqueta="Piezas inspeccionadas" valor={datos.piezas} indice={2} />
        <Kpi etiqueta="Clientes facturables" valor={datos.clientes.length} indice={3} />
      </div>

      {datos.sinPrecio.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p className="font-semibold">⚠️ {datos.sinPrecio.length} inspección(es) con piezas pero sin precio por pieza:</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {datos.sinPrecio.map((l) => (
              <Link key={l.id} href={`/inspecciones/${l.id}`} className="underline">
                {l.numeroParte ?? l.nombre} ({l.piezas} pzas)
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      <div className="card">
        <h2 className="mb-1 font-display font-semibold text-navy-900">Subtotal facturable por mes</h2>
        <p className="mb-4 text-xs text-navy-400">Últimos 6 meses · sin IVA</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={historico} margin={{ top: 24, right: 8, left: 8, bottom: 0 }} barCategoryGap="35%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E3E7F3" />
            <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#5D74C7" }} />
            <YAxis
              tickFormatter={monedaCorta}
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fontSize: 11, fill: "#5D74C7" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(58,80,168,0.08)" }}
              formatter={(v) => [formatoMoneda(Number(v)), "Subtotal"]}
              labelFormatter={(_, p) => (p?.[0] ? nombreMes(p[0].payload.mes) : "")}
              contentStyle={{ borderRadius: 10, border: "1px solid #D6DCF1", fontSize: 12 }}
            />
            <Bar dataKey="subtotal" fill="#3A50A8" radius={[4, 4, 0, 0]} maxBarSize={44}>
              <LabelList
                dataKey="subtotal"
                position="top"
                formatter={(v) => (Number(v) > 0 ? monedaCorta(Number(v)) : "")}
                style={{ fontSize: 11, fontWeight: 600, fill: "#3A50A8" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <h2 className="font-display font-semibold text-navy-900">Por cliente</h2>
        {datos.clientes.length === 0 ? (
          <div className="card py-10 text-center text-sm text-navy-400">No hubo piezas inspeccionadas este mes.</div>
        ) : (
          datos.clientes.map((c, i) => {
            const abiertoAqui = abierto === c.cliente;
            const pct = datos.subtotal > 0 ? (c.importe / datos.subtotal) * 100 : 0;
            return (
              <motion.div
                key={c.cliente}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-0"
              >
                <button
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
                  onClick={() => setAbierto(abiertoAqui ? null : c.cliente)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold text-navy-900">🏢 {c.cliente}</p>
                    <p className="text-xs text-navy-500">
                      {c.lineas.length} {c.lineas.length === 1 ? "inspección" : "inspecciones"} ·{" "}
                      {c.piezas.toLocaleString("es-MX")} piezas · {pct.toFixed(0)}% del mes
                    </p>
                    <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-navy-100">
                      <motion.div
                        className="h-full rounded-full bg-navy-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.1 + i * 0.05 }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-extrabold text-navy-900">{formatoMoneda(c.importe)}</p>
                    <p className="text-xs text-navy-400">+ IVA {formatoMoneda(c.importe * datos.tasaIva)}</p>
                  </div>
                  <span className={`text-navy-400 transition-transform ${abiertoAqui ? "rotate-180" : ""}`}>▼</span>
                </button>
                <AnimatePresence initial={false}>
                  {abiertoAqui && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="overflow-x-auto border-t border-navy-100">
                        <table className="w-full text-sm">
                          <thead className="bg-navy-50 text-left text-xs uppercase text-navy-500">
                            <tr>
                              <th className="px-4 py-2">Inspección</th>
                              <th className="px-4 py-2">Planta</th>
                              <th className="px-4 py-2 text-right">Piezas</th>
                              <th className="px-4 py-2 text-right">Precio/pza</th>
                              <th className="px-4 py-2 text-right">Importe</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-navy-100">
                            {c.lineas.map((l) => (
                              <tr key={l.id}>
                                <td className="px-4 py-2">
                                  <Link href={`/inspecciones/${l.id}`} className="font-medium text-navy-900 hover:underline">
                                    {l.numeroParte ? `${l.numeroParte} · ` : ""}
                                    {l.nombre}
                                  </Link>
                                </td>
                                <td className="px-4 py-2 text-navy-600">{l.planta ?? "—"}</td>
                                <td className="px-4 py-2 text-right tabular-nums">{l.piezas.toLocaleString("es-MX")}</td>
                                <td
                                  className={`px-4 py-2 text-right tabular-nums ${l.precio === 0 ? "font-semibold text-amber-700" : ""}`}
                                >
                                  {l.precio === 0 ? "Sin precio" : precioExacto(l.precio)}
                                </td>
                                <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatoMoneda(l.importe)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end p-4">
                        <a
                          className="btn-accent"
                          href={`/api/facturacion/pdf?mes=${mes}&cliente=${encodeURIComponent(c.cliente)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          📄 Estado de cuenta PDF
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
