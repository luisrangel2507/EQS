"use client";

import { useEffect, useState } from "react";
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

function TituloSeccion({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 -mt-5 mb-4">
      <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-yellow via-amber-400 to-orange-500" />
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="font-display font-semibold text-navy-900">{children}</h2>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          En vivo
        </span>
      </div>
    </div>
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
      <TituloSeccion>Sorteos abiertos</TituloSeccion>
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
      <TituloSeccion>Residentes</TituloSeccion>
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

// autorreporte de estado para el Residente: no tiene una pantalla de trabajo
// como el Inspector, así que reporta su estado directo desde el Dashboard.
export function MiEstadoResidenteCard() {
  const [estado, setEstado] = useState<string | null>(null);
  const [desde, setDesde] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/estado")
      .then((r) => r.json())
      .then((d) => {
        setEstado(d?.estado ?? null);
        setDesde(d?.desde ?? null);
      })
      .finally(() => setCargando(false));
  }, []);

  async function cambiar(valor: string) {
    setGuardando(valor);
    const res = await fetch("/api/estado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: valor }),
    });
    if (res.ok) {
      setEstado(valor);
      setDesde(new Date().toISOString());
    }
    setGuardando(null);
  }

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <TituloSeccion>Mi estado</TituloSeccion>
        {desde && !cargando && (
          <span className="text-xs text-navy-400">
            Desde{" "}
            {new Date(desde).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      {cargando ? (
        <p className="text-sm text-navy-400">Cargando…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {ESTADOS_INSPECTOR.map((e) => (
            <button
              key={e.valor}
              type="button"
              onClick={() => cambiar(e.valor)}
              disabled={guardando !== null}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
                estado === e.valor
                  ? `${e.color} border-transparent`
                  : "border-navy-200 text-navy-600 hover:bg-navy-50"
              }`}
            >
              {e.etiqueta}
            </button>
          ))}
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
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${
        alerta
          ? "border-red-500/30 bg-gradient-to-br from-red-950 via-navy-900 to-navy-950"
          : "border-yellow/20 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition group-hover:scale-125 ${
          alerta ? "bg-red-500/30" : "bg-yellow/25"
        }`}
      />
      <p className="relative text-[11px] font-semibold uppercase tracking-widest text-white/50">
        {etiqueta}
      </p>
      <p
        className={`relative mt-1 font-display text-3xl font-bold tabular-nums drop-shadow ${
          alerta ? "text-red-400" : "text-yellow"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
