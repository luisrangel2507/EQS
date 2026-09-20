"use client";

import { useState } from "react";
import Link from "next/link";
import type { Rol } from "@prisma/client";
import { usePolling } from "@/lib/usePolling";
import { ESTADOS_INSPECTOR } from "@/lib/constants";

export type Inspeccion = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  planta: string | null;
  piezasBuenas: number;
  piezasMalas: number;
  porcentajeRechazo: number;
};

export type SorteoAbierto = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  cliente: string | null;
  planta: string | null;
  piezasBuenas: number;
  piezasMalas: number;
  inspectoresRevisando: number;
  topDefecto: string | null;
};

export type DashboardData = {
  kpis: {
    inspeccionesActivas: number;
    piezasInspeccionadasMes: number;
    facturadoMes: number | null;
    porcentajeRechazoGlobal: number;
    inspeccionesEnCritico: number;
  };
  alertasRechazo: Inspeccion[];
  inspectoresEnPausa: { usuarioId: string; nombre: string; estado: string; minutos: number }[];
  estadoInspectores: { usuarioId: string; nombre: string; estado: string; desde: string }[];
  sorteosAbiertos: SorteoAbierto[];
};

export type SolicitudApoyo = {
  id: string;
  estacion: string | null;
  creadoEn: string;
  usuario: { id: string; nombre: string };
  inspeccion: { id: string; nombre: string; numeroParte: string | null } | null;
};

export type Residente = {
  id: string;
  nombre: string;
  rol: string;
  plantaResidente: string | null;
  _count: { notasResidente: number };
};

export function estadoInfo(valor: string) {
  return ESTADOS_INSPECTOR.find((e) => e.valor === valor) ?? ESTADOS_INSPECTOR[0];
}

export function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(valor);
}

const TONOS_PILL: Record<string, string> = {
  navy: "from-navy-700 to-navy-900 text-white",
  azul: "from-blue-500 to-indigo-600 text-white",
  verde: "from-emerald-500 to-teal-600 text-white",
  rojo: "from-red-500 to-orange-500 text-white",
};

export function Pill({ tono, children }: { tono: keyof typeof TONOS_PILL; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-black/5 ${TONOS_PILL[tono]}`}
    >
      {children}
    </span>
  );
}

export function SorteosAbiertosCard({
  rol,
  sorteosAbiertos,
}: {
  rol: Rol;
  sorteosAbiertos: SorteoAbierto[];
}) {
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

  return (
    <div className="card">
      <h2 className="mb-3 font-display font-semibold text-navy-900">Sorteos abiertos</h2>
      {sorteosAbiertos.length === 0 ? (
        <p className="text-sm text-navy-400">No hay sorteos activos por el momento.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorteosAbiertos.map((s) => {
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
  );
}

export function ResidentesResumenCard({ residentes }: { residentes: Residente[] }) {
  return (
    <div className="card">
      <h2 className="mb-3 font-display font-semibold text-navy-900">Residentes</h2>
      {residentes.length === 0 ? (
        <p className="text-sm text-navy-400">No hay residentes activos por el momento.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {residentes.map((r) => {
            const hallazgos = r._count.notasResidente;
            return (
              <Link
                key={r.id}
                href="/residentes"
                className="block rounded-2xl border border-navy-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="truncate font-display font-semibold text-navy-900">{r.nombre}</p>
                <p className="truncate text-xs text-navy-400">
                  {r.plantaResidente ? `🏭 ${r.plantaResidente}` : "Sin planta asignada"}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Pill tono="verde">🟢 Activo</Pill>
                  {hallazgos > 0 ? (
                    <Pill tono="rojo">
                      ⚠️ {hallazgos} {hallazgos === 1 ? "hallazgo" : "hallazgos"}
                    </Pill>
                  ) : (
                    <Pill tono="verde">✅ Todo en orden</Pill>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Kpi({
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
