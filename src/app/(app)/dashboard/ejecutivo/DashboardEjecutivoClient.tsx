"use client";

import { useState } from "react";
import Link from "next/link";
import type { Rol } from "@prisma/client";
import { usePolling } from "@/lib/usePolling";
import {
  Kpi,
  Pill,
  estadoInfo,
  formatoMoneda,
  type DashboardData,
  type SolicitudApoyo,
} from "../shared";

export default function DashboardEjecutivoClient({ rol }: { rol: Rol }) {
  const { datos, cargando } = usePolling<DashboardData>("/api/dashboard", 7000);
  const [recordados, setRecordados] = useState<Set<string>>(new Set());
  const { datos: solicitudesTodas, recargar: recargarApoyo } = usePolling<SolicitudApoyo[]>(
    "/api/apoyo",
    5000
  );
  // A Supervisor solo le salen solicitudes con más de 15 min de antigüedad;
  // Admin y Líder las ven desde que se crean.
  const solicitudes =
    rol === "SUPERVISOR"
      ? solicitudesTodas?.filter(
          (s) => (Date.now() - new Date(s.creadoEn).getTime()) / 60000 >= 15
        )
      : solicitudesTodas;

  async function atender(id: string) {
    await fetch(`/api/apoyo/${id}`, { method: "PATCH" });
    recargarApoyo();
  }

  async function recordarLider(sol: SolicitudApoyo) {
    const minutos = Math.max(0, Math.floor((Date.now() - new Date(sol.creadoEn).getTime()) / 60000));
    const lugar = sol.inspeccion?.numeroParte ?? sol.inspeccion?.nombre ?? sol.estacion ?? "piso";
    const contenido = `⏰ Recordatorio: la solicitud de apoyo de ${sol.usuario.nombre} en ${lugar} sigue sin atenderse (hace ${minutos} min). ¿Algún líder puede ir?`;
    setRecordados((prev) => new Set(prev).add(sol.id));
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido }),
    });
    setTimeout(() => {
      setRecordados((prev) => {
        const next = new Set(prev);
        next.delete(sol.id);
        return next;
      });
    }, 15000);
  }

  if (cargando || !datos) {
    return <p className="text-sm text-navy-500">Cargando…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-xs font-semibold text-navy-400 hover:text-navy-700">
          ← Dashboard
        </Link>
        <h1 className="font-display text-2xl font-bold text-navy-900">📊 Dashboard Ejecutivo</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi etiqueta="Sorteos activos" valor={datos.kpis.inspeccionesActivas} />
        <Kpi etiqueta="Piezas inspeccionadas (mes)" valor={datos.kpis.piezasInspeccionadasMes} />
        {datos.kpis.facturadoMes !== null && (
          <Kpi etiqueta="Facturado en el mes" valor={formatoMoneda(datos.kpis.facturadoMes)} />
        )}
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

      <div className="card">
        <h2 className="mb-3 font-display font-semibold text-navy-900">Sorteos abiertos</h2>
        {datos.sorteosAbiertos.length === 0 ? (
          <p className="text-sm text-navy-400">No hay sorteos activos por el momento.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {datos.sorteosAbiertos.map((s) => {
              const total = s.piezasBuenas + s.piezasMalas;
              const rechazo = total > 0 ? (s.piezasMalas / total) * 100 : 0;
              const apoyoAqui = solicitudes?.filter((sol) => sol.inspeccion?.id === s.id) ?? [];
              return (
                <Link
                  key={s.id}
                  href={`/inspecciones/${s.id}`}
                  className="block rounded-2xl border border-navy-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="truncate font-display font-semibold text-navy-900">
                    {s.numeroParte ?? s.nombre}
                  </p>
                  <p className="truncate text-xs text-navy-400">{s.nombre}</p>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="font-semibold text-green-700">✅ {s.piezasBuenas} buenas</span>
                    <span className="font-semibold text-red-700">❌ {s.piezasMalas} malas</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.cliente && <Pill tono="navy">🏢 {s.cliente}</Pill>}
                    <Pill tono="azul">{s.numeroParte ?? "—"}</Pill>
                    <Pill tono="verde">👥 {s.inspectoresRevisando} revisando</Pill>
                    {s.topDefecto && <Pill tono="rojo">⚠️ {s.topDefecto}</Pill>}
                    {rechazo >= 8 && <Pill tono="rojo">🔥 {rechazo.toFixed(0)}% rechazo</Pill>}
                    {apoyoAqui.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-white shadow-sm ring-1 ring-black/5">
                        🔔 {apoyoAqui.length > 1
                          ? `${apoyoAqui.length} piden apoyo`
                          : `${apoyoAqui[0].usuario.nombre} pide apoyo`}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            apoyoAqui.forEach((sol) => atender(sol.id));
                          }}
                          className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold hover:bg-white/30"
                        >
                          Atender
                        </button>
                        {rol === "SUPERVISOR" && (
                          <button
                            type="button"
                            disabled={apoyoAqui.some((sol) => recordados.has(sol.id))}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              apoyoAqui.forEach((sol) => recordarLider(sol));
                            }}
                            className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold hover:bg-white/30 disabled:opacity-60"
                          >
                            {apoyoAqui.some((sol) => recordados.has(sol.id))
                              ? "✓ Avisado"
                              : "Recordar a líder"}
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

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
    </div>
  );
}
