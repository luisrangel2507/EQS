"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Inspeccion = {
  id: string;
  nombre: string;
  cliente: string | null;
  planta: string | null;
  cerrado: boolean;
  creadoEn: string;
  piezasBuenas: number;
  piezasMalas: number;
};

export default function ReportesClient() {
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/inspecciones")
      .then((r) => r.json())
      .then(setInspecciones)
      .finally(() => setCargando(false));
  }, []);

  const ordenadas = [...inspecciones].sort(
    (a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime()
  );

  const datosTendencia = ordenadas
    .filter((i) => i.piezasBuenas + i.piezasMalas > 0)
    .map((i) => ({
      nombre: i.nombre.length > 14 ? `${i.nombre.slice(0, 14)}…` : i.nombre,
      porcentajeRechazo: Number(
        ((i.piezasMalas / (i.piezasBuenas + i.piezasMalas)) * 100).toFixed(1)
      ),
    }));

  if (cargando) return <p className="text-sm text-navy-500">Cargando…</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-navy-900">Reportes</h1>

      <div className="card">
        <h2 className="mb-3 font-display font-semibold text-navy-900">
          Tendencia de % de rechazo por inspección
        </h2>
        {datosTendencia.length === 0 ? (
          <p className="text-sm text-navy-400">Todavía no hay datos suficientes.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={datosTendencia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
              <YAxis unit="%" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line
                type="monotone"
                dataKey="porcentajeRechazo"
                stroke="#142B6B"
                strokeWidth={2}
                dot={{ fill: "#F4D935", stroke: "#142B6B", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase text-navy-500">
            <tr>
              <th className="px-4 py-3">Inspección</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Planta</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">% Rechazo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {inspecciones.map((i) => {
              const total = i.piezasBuenas + i.piezasMalas;
              const rechazo = total > 0 ? (i.piezasMalas / total) * 100 : 0;
              return (
                <tr key={i.id}>
                  <td className="px-4 py-3">
                    <Link href={`/inspecciones/${i.id}`} className="font-medium text-navy-900 hover:underline">
                      {i.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-navy-600">{i.cliente ?? "—"}</td>
                  <td className="px-4 py-3 text-navy-600">{i.planta ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${i.cerrado ? "bg-navy-100 text-navy-500" : "bg-green-100 text-green-800"}`}
                    >
                      {i.cerrado ? "Cerrada" : "Activa"}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${rechazo >= 8 ? "font-semibold text-red-600" : "text-navy-700"}`}>
                    {rechazo.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/api/inspecciones/${i.id}/csv`}
                      className="text-xs font-semibold text-navy-500 hover:text-navy-900"
                    >
                      Exportar CSV
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
