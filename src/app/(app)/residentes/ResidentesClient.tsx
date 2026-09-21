"use client";

import { useEffect, useMemo, useState } from "react";
import { usePolling } from "@/lib/usePolling";
import { ESTADOS_INSPECTOR, ROL_ETIQUETAS, TOLERANCIA_MINUTOS } from "@/lib/constants";
import { Kpi } from "@/app/(app)/dashboard/shared";

type Residente = {
  id: string;
  nombre: string;
  rol: string;
  plantaResidente: string | null;
  estado: { estado: string; desde: string } | null;
  _count: { notasResidente: number };
};

function minutosDesde(desde: string) {
  return Math.floor((Date.now() - new Date(desde).getTime()) / 60000);
}

// mismo criterio de tolerancia que usa el Dashboard para inspectores: si lleva
// más de lo permitido en un estado que no es "activo", se marca en alerta.
function enAlerta(r: Residente) {
  if (!r.estado) return false;
  if (r.estado.estado === "activo") return false;
  const tolerancia = TOLERANCIA_MINUTOS[r.estado.estado] ?? 15;
  return minutosDesde(r.estado.desde) >= tolerancia;
}

type Nota = {
  id: string;
  contenido: string;
  creadoEn: string;
  autor: { nombre: string; rol: string };
};

function estadoInfo(valor: string) {
  return ESTADOS_INSPECTOR.find((e) => e.valor === valor) ?? ESTADOS_INSPECTOR[0];
}

export default function ResidentesClient() {
  const { datos: residentes, cargando } = usePolling<Residente[]>("/api/residentes", 15000);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [plantaFiltro, setPlantaFiltro] = useState("");

  const plantas = useMemo(() => {
    const set = new Set((residentes ?? []).map((r) => r.plantaResidente).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [residentes]);

  const resumen = useMemo(() => {
    const lista = residentes ?? [];
    return {
      total: lista.length,
      activos: lista.filter((r) => r.estado?.estado === "activo").length,
      alertas: lista.filter(enAlerta).length,
      sinReportar: lista.filter((r) => !r.estado).length,
    };
  }, [residentes]);

  const filtrados = useMemo(() => {
    return (residentes ?? []).filter((r) => {
      if (plantaFiltro && r.plantaResidente !== plantaFiltro) return false;
      if (busqueda && !r.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
      return true;
    });
  }, [residentes, plantaFiltro, busqueda]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Seguimiento de Residentes</h1>
        <p className="text-sm text-navy-500">
          Personal de EQS asignado de forma fija a la planta de un cliente. Da clic en uno para ver
          o agregar notas de seguimiento.
        </p>
      </div>

      {!cargando && residentes && residentes.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi etiqueta="Residentes" valor={resumen.total} />
            <Kpi etiqueta="Activos" valor={resumen.activos} />
            <Kpi etiqueta="En alerta" valor={resumen.alertas} alerta={resumen.alertas > 0} />
            <Kpi etiqueta="Sin reportar" valor={resumen.sinReportar} />
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              className="input max-w-xs flex-1"
              placeholder="Buscar por nombre…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select
              className="input max-w-[220px]"
              value={plantaFiltro}
              onChange={(e) => setPlantaFiltro(e.target.value)}
            >
              <option value="">Todas las plantas</option>
              {plantas.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {cargando ? (
        <p className="text-sm text-navy-500">Cargando…</p>
      ) : !residentes || residentes.length === 0 ? (
        <p className="card text-sm text-navy-400">
          Todavía no hay Residentes marcados. Puedes hacerlo desde Usuarios.
        </p>
      ) : filtrados.length === 0 ? (
        <p className="card text-sm text-navy-400">Ningún Residente coincide con el filtro.</p>
      ) : (
        <div className="space-y-3">
          {filtrados.map((r) => {
            const info = r.estado ? estadoInfo(r.estado.estado) : null;
            const abierto = abiertoId === r.id;
            const alerta = enAlerta(r);
            return (
              <div
                key={r.id}
                className="card"
                style={alerta ? { borderColor: "#fca5a5", backgroundColor: "#fef2f2" } : undefined}
              >
                <button
                  type="button"
                  onClick={() => setAbiertoId(abierto ? null : r.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                >
                  <div>
                    <p className="font-display font-semibold text-navy-900">
                      {alerta && "🚨 "}
                      {r.nombre}
                    </p>
                    <p className="text-xs text-navy-500">
                      {ROL_ETIQUETAS[r.rol] ?? r.rol}
                      {r.plantaResidente ? ` · 🏭 ${r.plantaResidente}` : ""}
                      {r.estado && ` · hace ${minutosDesde(r.estado.desde)} min`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {info ? (
                      <span className={`badge ${info.color}`}>{info.etiqueta}</span>
                    ) : (
                      <span className="badge bg-navy-50 text-navy-400">Sin estado reportado</span>
                    )}
                    <span className="badge bg-navy-50 text-navy-600">
                      📝 {r._count.notasResidente}
                    </span>
                    <span className="text-navy-400">{abierto ? "▲" : "▼"}</span>
                  </div>
                </button>

                {abierto && <BitacoraResidente residenteId={r.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BitacoraResidente({ residenteId }: { residenteId: string }) {
  const [notas, setNotas] = useState<Nota[] | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/residentes/${residenteId}/notas`)
      .then((r) => r.json())
      .then(setNotas);
  }, [residenteId]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido) return;
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/residentes/${residenteId}/notas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo guardar la nota");
      return;
    }
    setTexto("");
    fetch(`/api/residentes/${residenteId}/notas`)
      .then((r) => r.json())
      .then(setNotas);
  }

  return (
    <div className="mt-4 space-y-3 border-t border-navy-100 pt-4">
      {notas === null ? (
        <p className="text-sm text-navy-400">Cargando bitácora…</p>
      ) : notas.length === 0 ? (
        <p className="text-sm text-navy-400">Sin notas de seguimiento todavía.</p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {notas.map((n) => (
            <li key={n.id} className="rounded-lg bg-navy-50 px-3 py-2 text-sm">
              <p className="mb-0.5 text-xs font-semibold text-navy-500">
                {n.autor.nombre} · {ROL_ETIQUETAS[n.autor.rol] ?? n.autor.rol} ·{" "}
                {new Date(n.creadoEn).toLocaleString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="whitespace-pre-wrap text-navy-800">{n.contenido}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={agregar} className="flex items-end gap-2">
        <textarea
          className="input flex-1 resize-none"
          rows={2}
          placeholder="Agregar nota de seguimiento…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={2000}
        />
        <button type="submit" className="btn-primary" disabled={enviando || !texto.trim()}>
          Agregar
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
