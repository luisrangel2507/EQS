"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePolling } from "@/lib/usePolling";
import { DEFECTOS_COMUNES, ESTADOS_INSPECTOR } from "@/lib/constants";

type SesionUsuario = {
  id: string;
  nombre: string;
  rol: "ADMIN" | "SUPERVISOR" | "INSPECTOR" | "CLIENTE";
};

type Inspeccion = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  cliente: string | null;
  planta: string | null;
  meta: number;
  fechaEntrega: string | null;
  instrucciones: string | null;
  piezasBuenas: number;
  piezasMalas: number;
  cerrado: boolean;
  cerradoPor: string | null;
  cerradoEn: string | null;
  inspectores: { usuario: { id: string; nombre: string } }[];
  defectos: { tipo: string; cantidad: number }[];
};

export default function InspeccionDetalleClient({
  id,
  sesion,
}: {
  id: string;
  sesion: SesionUsuario;
}) {
  const router = useRouter();
  const { datos: inspeccion, cargando, recargar } = usePolling<Inspeccion>(
    `/api/inspecciones/${id}`,
    6000
  );
  const [mostrarCierre, setMostrarCierre] = useState(false);

  const asignado = inspeccion?.inspectores.some((a) => a.usuario.id === sesion.id) ?? false;
  const puedeCapturar =
    !inspeccion?.cerrado &&
    (sesion.rol === "ADMIN" || sesion.rol === "SUPERVISOR" || (sesion.rol === "INSPECTOR" && asignado));
  const puedeGestionar = sesion.rol === "ADMIN" || sesion.rol === "SUPERVISOR";

  if (cargando || !inspeccion) {
    return <p className="text-sm text-navy-500">Cargando…</p>;
  }

  const total = inspeccion.piezasBuenas + inspeccion.piezasMalas;
  const rechazo = total > 0 ? inspeccion.piezasMalas / total : 0;
  const progreso = inspeccion.meta > 0 ? Math.min(100, (total / inspeccion.meta) * 100) : 0;

  const datosPareto = [...inspeccion.defectos]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 8)
    .map((d) => ({ tipo: d.tipo, cantidad: d.cantidad }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => router.push("/inspecciones")}
            className="mb-1 text-xs font-semibold text-navy-400 hover:text-navy-700"
          >
            ← Inspecciones
          </button>
          <h1 className="font-display text-2xl font-bold text-navy-900">{inspeccion.nombre}</h1>
          <p className="text-sm text-navy-500">
            {inspeccion.numeroParte ?? "Sin número de parte"} · {inspeccion.planta ?? "Sin planta"}
            {inspeccion.cliente ? ` · Cliente: ${inspeccion.cliente}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`badge ${inspeccion.cerrado ? "bg-navy-100 text-navy-500" : "bg-green-100 text-green-800"}`}
          >
            {inspeccion.cerrado ? "Cerrada" : "Activa"}
          </span>
          {inspeccion.cerrado && (
            <a href={`/api/inspecciones/${id}/reporte`} target="_blank" className="btn-secondary">
              Descargar PDF
            </a>
          )}
          <a href={`/api/inspecciones/${id}/csv`} className="btn-secondary">
            Exportar CSV
          </a>
          {puedeGestionar && !inspeccion.cerrado && (
            <button className="btn-accent" onClick={() => setMostrarCierre(true)}>
              Cerrar inspección
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica etiqueta="Piezas buenas" valor={inspeccion.piezasBuenas} />
        <Metrica etiqueta="Piezas malas" valor={inspeccion.piezasMalas} />
        <Metrica
          etiqueta="% Rechazo"
          valor={`${(rechazo * 100).toFixed(1)}%`}
          alerta={rechazo >= 0.08}
        />
        <Metrica etiqueta="Meta" valor={`${total} / ${inspeccion.meta || "—"}`} />
      </div>
      <div className="h-2 w-full rounded-full bg-navy-100">
        <div className="h-2 rounded-full bg-yellow" style={{ width: `${progreso}%` }} />
      </div>

      {inspeccion.instrucciones && (
        <div className="card">
          <h2 className="mb-1 font-display font-semibold text-navy-900">
            Instrucción de trabajo / criterio de aceptación
          </h2>
          <p className="whitespace-pre-wrap text-sm text-navy-600">{inspeccion.instrucciones}</p>
        </div>
      )}

      {puedeCapturar && (
        <CapturaPanel inspeccionId={id} onCapturado={recargar} />
      )}

      {sesion.rol === "INSPECTOR" && asignado && !inspeccion.cerrado && (
        <EstadoInspectorPanel />
      )}

      <div className="card">
        <h2 className="mb-3 font-display font-semibold text-navy-900">Pareto de defectos</h2>
        {datosPareto.length === 0 ? (
          <p className="text-sm text-navy-400">Todavía no se han registrado defectos.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={datosPareto} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="tipo" width={160} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#142B6B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {inspeccion.inspectores.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-display font-semibold text-navy-900">Inspectores asignados</h2>
          <div className="flex flex-wrap gap-2">
            {inspeccion.inspectores.map((a) => (
              <span key={a.usuario.id} className="badge bg-navy-50 text-navy-700">
                {a.usuario.nombre}
              </span>
            ))}
          </div>
        </div>
      )}

      {inspeccion.cerrado && (
        <div className="card bg-navy-50">
          <p className="text-sm text-navy-700">
            Cerrada por <strong>{inspeccion.cerradoPor}</strong> el{" "}
            {inspeccion.cerradoEn && new Date(inspeccion.cerradoEn).toLocaleString("es-MX")}
          </p>
        </div>
      )}

      {mostrarCierre && (
        <CierreModal
          inspeccionId={id}
          nombreSugerido={sesion.nombre}
          onCerrar={() => setMostrarCierre(false)}
          onCerrado={() => {
            setMostrarCierre(false);
            recargar();
          }}
        />
      )}
    </div>
  );
}

function Metrica({
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
      <p className={`mt-1 font-display text-2xl font-bold ${alerta ? "text-red-700" : "text-navy-900"}`}>
        {valor}
      </p>
    </div>
  );
}

function CapturaPanel({
  inspeccionId,
  onCapturado,
}: {
  inspeccionId: string;
  onCapturado: () => void;
}) {
  const [mostrarMala, setMostrarMala] = useState(false);
  const [defecto, setDefecto] = useState<string>(DEFECTOS_COMUNES[0]);
  const [foto, setFoto] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function capturarBuena() {
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/inspecciones/${inspeccionId}/capturas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "buena" }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo registrar la pieza");
      return;
    }
    onCapturado();
  }

  async function capturarMala(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    let fotoUrl: string | undefined;
    if (foto) {
      const form = new FormData();
      form.append("foto", foto);
      const resFoto = await fetch("/api/upload", { method: "POST", body: form });
      if (resFoto.ok) {
        fotoUrl = (await resFoto.json()).url;
      }
    }

    const res = await fetch(`/api/inspecciones/${inspeccionId}/capturas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "mala", defecto, fotoUrl }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo registrar la pieza");
      return;
    }
    setMostrarMala(false);
    setFoto(null);
    if (inputRef.current) inputRef.current.value = "";
    onCapturado();
  }

  return (
    <div className="card">
      <h2 className="mb-3 font-display font-semibold text-navy-900">Captura</h2>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={capturarBuena}
          disabled={enviando}
          className="flex h-28 flex-col items-center justify-center rounded-xl bg-green-600 text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
        >
          <span className="text-3xl font-bold">+1</span>
          <span className="text-sm font-medium">Pieza buena</span>
        </button>
        <button
          onClick={() => setMostrarMala(true)}
          disabled={enviando}
          className="flex h-28 flex-col items-center justify-center rounded-xl bg-red-600 text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
        >
          <span className="text-3xl font-bold">+1</span>
          <span className="text-sm font-medium">Pieza mala</span>
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {mostrarMala && (
        <form onSubmit={capturarMala} className="mt-4 space-y-3 rounded-lg border border-navy-100 p-3">
          <div>
            <label className="label">Tipo de defecto</label>
            <select className="input" value={defecto} onChange={(e) => setDefecto(e.target.value)}>
              {DEFECTOS_COMUNES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Foto de evidencia (opcional)</label>
            <input
              ref={inputRef}
              className="input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={enviando}>
              {enviando ? "Guardando…" : "Registrar pieza mala"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setMostrarMala(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function EstadoInspectorPanel() {
  const [estado, setEstado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/estado")
      .then((r) => r.json())
      .then((d) => setEstado(d?.estado ?? "activo"))
      .finally(() => setCargando(false));
  }, []);

  async function cambiar(valor: string) {
    setEstado(valor);
    await fetch("/api/estado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: valor }),
    });
  }

  return (
    <div className="card">
      <h2 className="mb-3 font-display font-semibold text-navy-900">Mi estado</h2>
      {cargando ? (
        <p className="text-sm text-navy-400">Cargando…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {ESTADOS_INSPECTOR.map((e) => (
            <button
              key={e.valor}
              onClick={() => cambiar(e.valor)}
              className={`badge border transition ${
                estado === e.valor ? `${e.color} border-transparent` : "border-navy-200 text-navy-500"
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

function CierreModal({
  inspeccionId,
  nombreSugerido,
  onCerrar,
  onCerrado,
}: {
  inspeccionId: string;
  nombreSugerido: string;
  onCerrar: () => void;
  onCerrado: () => void;
}) {
  const [cerradoPor, setCerradoPor] = useState(nombreSugerido);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/inspecciones/${inspeccionId}/cerrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cerradoPor }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo cerrar la inspección");
      return;
    }
    onCerrado();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-navy-900/60 px-4">
      <form onSubmit={confirmar} className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
        <h2 className="mb-1 font-display text-lg font-bold text-navy-900">Cerrar inspección</h2>
        <p className="mb-4 text-sm text-navy-500">
          Esta acción es definitiva. Ya no se podrán registrar más piezas.
        </p>
        <label className="label">Firma de cierre (nombre de quien cierra)</label>
        <input
          className="input"
          value={cerradoPor}
          onChange={(e) => setCerradoPor(e.target.value)}
          required
          minLength={2}
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button type="submit" className="btn-accent" disabled={enviando}>
            {enviando ? "Cerrando…" : "Confirmar cierre"}
          </button>
          <button type="button" className="btn-secondary" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
