"use client";

import Link from "next/link";
import type { Rol } from "@prisma/client";
import { usePolling } from "@/lib/usePolling";
import { ESTADOS_INSPECTOR } from "@/lib/constants";

type Inspeccion = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  planta: string | null;
  piezasBuenas: number;
  piezasMalas: number;
  porcentajeRechazo: number;
};

type DashboardData = {
  kpis: {
    inspeccionesActivas: number;
    piezasHoy: number;
    porcentajeRechazoGlobal: number;
    inspeccionesEnCritico: number;
  };
  alertasRechazo: Inspeccion[];
  inspectoresEnPausa: { usuarioId: string; nombre: string; estado: string; minutos: number }[];
  estadoInspectores: { usuarioId: string; nombre: string; estado: string; desde: string }[];
};

function estadoInfo(valor: string) {
  return ESTADOS_INSPECTOR.find((e) => e.valor === valor) ?? ESTADOS_INSPECTOR[0];
}

export default function DashboardClient({ rol }: { rol: Rol }) {
  const { datos, cargando } = usePolling<DashboardData>("/api/dashboard", 7000);
  const esOperativo = rol === "ADMIN" || rol === "SUPERVISOR";

  if (cargando || !datos) {
    return <p className="text-sm text-navy-500">Cargando dashboard…</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-navy-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi etiqueta="Inspecciones activas" valor={datos.kpis.inspeccionesActivas} />
        <Kpi etiqueta="Piezas hoy" valor={datos.kpis.piezasHoy} />
        <Kpi
          etiqueta="% Rechazo global"
          valor={`${(datos.kpis.porcentajeRechazoGlobal * 100).toFixed(1)}%`}
          alerta={datos.kpis.porcentajeRechazoGlobal >= 0.08}
        />
        <Kpi
          etiqueta="Inspecciones en crítico"
          valor={datos.kpis.inspeccionesEnCritico}
          alerta={datos.kpis.inspeccionesEnCritico > 0}
        />
      </div>

      {esOperativo && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-3 font-display font-semibold text-navy-900">
              Alertas de rechazo (≥ 8%)
            </h2>
            {datos.alertasRechazo.length === 0 ? (
              <p className="text-sm text-navy-400">Sin alertas por el momento.</p>
            ) : (
              <ul className="space-y-2">
                {datos.alertasRechazo.map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/inspecciones/${i.id}`}
                      className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm hover:bg-red-100"
                    >
                      <span className="font-medium text-red-900">{i.nombre}</span>
                      <span className="font-semibold text-red-700">
                        {(i.porcentajeRechazo * 100).toFixed(1)}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 font-display font-semibold text-navy-900">
              Inspectores con pausa prolongada
            </h2>
            {datos.inspectoresEnPausa.length === 0 ? (
              <p className="text-sm text-navy-400">Nadie excede el tiempo de pausa.</p>
            ) : (
              <ul className="space-y-2">
                {datos.inspectoresEnPausa.map((e) => (
                  <li
                    key={e.usuarioId}
                    className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-orange-900">{e.nombre}</span>
                    <span className="text-orange-700">
                      {estadoInfo(e.estado).etiqueta} · {e.minutos} min
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card lg:col-span-2">
            <h2 className="mb-3 font-display font-semibold text-navy-900">
              Estado en vivo de inspectores
            </h2>
            {datos.estadoInspectores.length === 0 ? (
              <p className="text-sm text-navy-400">Ningún inspector ha reportado estado todavía.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {datos.estadoInspectores.map((e) => {
                  const info = estadoInfo(e.estado);
                  return (
                    <span key={e.usuarioId} className={`badge ${info.color}`}>
                      {e.nombre} · {info.etiqueta}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  etiqueta,
  valor,
  alerta,
}: {
  etiqueta: string;
  valor: string | number;
  alerta?: boolean;
}) {
  return (
    <div className={`card ${alerta ? "border-red-300 bg-red-50" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">{etiqueta}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${alerta ? "text-red-700" : "text-navy-900"}`}>
        {valor}
      </p>
    </div>
  );
}
