"use client";

import Image from "next/image";
import Link from "next/link";
import type { Rol } from "@prisma/client";
import { usePolling } from "@/lib/usePolling";
import { ESTADOS_INSPECTOR, FRASES_DEL_DIA } from "@/lib/constants";

type Inspeccion = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  planta: string | null;
  piezasBuenas: number;
  piezasMalas: number;
  porcentajeRechazo: number;
};

type SorteoAbierto = {
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

type DashboardData = {
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

type SolicitudApoyo = {
  id: string;
  estacion: string | null;
  creadoEn: string;
  usuario: { id: string; nombre: string };
  inspeccion: { id: string; nombre: string; numeroParte: string | null } | null;
};

function estadoInfo(valor: string) {
  return ESTADOS_INSPECTOR.find((e) => e.valor === valor) ?? ESTADOS_INSPECTOR[0];
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(valor);
}

function fraseDelDia() {
  const inicioAno = new Date(new Date().getFullYear(), 0, 0);
  const dia = Math.floor((Date.now() - inicioAno.getTime()) / 86400000);
  return FRASES_DEL_DIA[dia % FRASES_DEL_DIA.length];
}

export default function DashboardClient({ rol, nombre }: { rol: Rol; nombre: string }) {
  const { datos, cargando } = usePolling<DashboardData>("/api/dashboard", 7000);
  const esOperativo = rol === "ADMIN" || rol === "SUPERVISOR" || rol === "LIDER";
  const { datos: solicitudes, recargar: recargarApoyo } = usePolling<SolicitudApoyo[]>(
    esOperativo ? "/api/apoyo" : null,
    5000
  );

  async function atender(id: string) {
    await fetch(`/api/apoyo/${id}`, { method: "PATCH" });
    recargarApoyo();
  }

  function minutosDesde(fecha: string) {
    return Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 60000));
  }

  if (cargando || !datos) {
    return <p className="text-sm text-navy-500">Cargando dashboard…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl">
        <div className="relative h-72 w-full sm:h-96">
          <Image
            src="/dashboard-hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/40 to-navy-900/5" />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow sm:text-sm">
            Dashboard
          </p>
          <h1 className="font-display text-3xl font-bold text-white drop-shadow sm:text-5xl">
            Bienvenido, {nombre.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
            <span className="font-semibold text-white">Frase del día:</span> {fraseDelDia()}
          </p>
        </div>
      </div>

      {esOperativo && solicitudes && solicitudes.length > 0 && (
        <div className="card border-orange-300 bg-orange-50">
          <h2 className="mb-3 font-display font-semibold text-orange-900">
            🔔 Solicitudes de apoyo en piso
          </h2>
          <ul className="space-y-2">
            {solicitudes.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm"
              >
                <span>
                  <span className="font-semibold text-navy-900">{s.usuario.nombre}</span>
                  {s.estacion ? ` · 📍 ${s.estacion}` : ""}
                  {s.inspeccion
                    ? ` · ${s.inspeccion.numeroParte ?? s.inspeccion.nombre}`
                    : ""}
                  <span className="text-navy-400"> · hace {minutosDesde(s.creadoEn)} min</span>
                </span>
                <button className="btn-accent px-3 py-1 text-xs" onClick={() => atender(s.id)}>
                  Atender
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi etiqueta="Inspecciones activas" valor={datos.kpis.inspeccionesActivas} />
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

      {esOperativo && (
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
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {s.cliente && <Pill tono="navy">🏢 {s.cliente}</Pill>}
                      <Pill tono="azul">
                        {s.numeroParte ?? "—"}
                      </Pill>
                      <Pill tono="verde">👥 {s.inspectoresRevisando} revisando</Pill>
                      {s.topDefecto && <Pill tono="rojo">⚠️ {s.topDefecto}</Pill>}
                      {rechazo >= 8 && (
                        <Pill tono="rojo">🔥 {rechazo.toFixed(0)}% rechazo</Pill>
                      )}
                      {apoyoAqui.length > 0 && (
                        <Pill tono="naranja">
                          🔔 {apoyoAqui.length > 1
                            ? `${apoyoAqui.length} piden apoyo`
                            : `${apoyoAqui[0].usuario.nombre} pide apoyo`}
                        </Pill>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

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

const TONOS_PILL: Record<string, string> = {
  navy: "from-navy-700 to-navy-900 text-white",
  azul: "from-blue-500 to-indigo-600 text-white",
  verde: "from-emerald-500 to-teal-600 text-white",
  rojo: "from-red-500 to-orange-500 text-white",
  naranja: "from-orange-500 to-amber-500 text-white",
};

function Pill({ tono, children }: { tono: keyof typeof TONOS_PILL; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-black/5 ${TONOS_PILL[tono]}`}
    >
      {children}
    </span>
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
