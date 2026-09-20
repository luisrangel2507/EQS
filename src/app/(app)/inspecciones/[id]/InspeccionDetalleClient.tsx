"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { DEFECTOS_COMUNES, ESTADOS_INSPECTOR, PLANTAS } from "@/lib/constants";
import SubidaPdf from "@/components/SubidaPdf";

type SesionUsuario = {
  id: string;
  nombre: string;
  rol: "ADMIN" | "SUPERVISOR" | "LIDER" | "INSPECTOR" | "CLIENTE";
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
  instruccionesPdfUrl: string | null;
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
  const [mostrarEditar, setMostrarEditar] = useState(false);

  const asignado = inspeccion?.inspectores.some((a) => a.usuario.id === sesion.id) ?? false;
  const puedeCapturar =
    !inspeccion?.cerrado &&
    (sesion.rol === "ADMIN" ||
      sesion.rol === "SUPERVISOR" ||
      sesion.rol === "LIDER" ||
      (sesion.rol === "INSPECTOR" && asignado));
  const puedeGestionar = sesion.rol === "ADMIN" || sesion.rol === "SUPERVISOR";

  if (cargando || !inspeccion) {
    return <p className="text-sm text-navy-500">Cargando…</p>;
  }

  if (sesion.rol === "INSPECTOR") {
    return (
      <VistaInspectorJuego
        id={id}
        inspeccion={inspeccion}
        puedeCapturar={puedeCapturar}
        asignado={asignado}
        recargar={recargar}
      />
    );
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
            <button className="btn-secondary" onClick={() => setMostrarEditar(true)}>
              Editar
            </button>
          )}
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

      {(inspeccion.instrucciones || inspeccion.instruccionesPdfUrl) && (
        <div className="card">
          <h2 className="mb-1 font-display font-semibold text-navy-900">
            Instrucción de trabajo / criterio de aceptación
          </h2>
          {inspeccion.instrucciones && (
            <p className="whitespace-pre-wrap text-sm text-navy-600">{inspeccion.instrucciones}</p>
          )}
          {inspeccion.instruccionesPdfUrl && (
            <a
              href={inspeccion.instruccionesPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-navy underline"
            >
              Ver PDF de instrucción de trabajo
            </a>
          )}
        </div>
      )}

      {puedeCapturar && (
        <CapturaPanel inspeccionId={id} onCapturado={recargar} mostrarExtras={false} />
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

      {mostrarEditar && (
        <EditarModal
          inspeccionId={id}
          inspeccion={inspeccion}
          onCerrar={() => setMostrarEditar(false)}
          onGuardado={() => {
            setMostrarEditar(false);
            recargar();
          }}
        />
      )}
    </div>
  );
}

function VistaInspectorJuego({
  id,
  inspeccion,
  puedeCapturar,
  asignado,
  recargar,
}: {
  id: string;
  inspeccion: Inspeccion;
  puedeCapturar: boolean;
  asignado: boolean;
  recargar: () => void;
}) {
  const router = useRouter();
  const [racha, setRacha] = useState(0);

  const total = inspeccion.piezasBuenas + inspeccion.piezasMalas;
  const progreso = inspeccion.meta > 0 ? Math.min(100, (total / inspeccion.meta) * 100) : 0;
  const metaCumplida = inspeccion.meta > 0 && total >= inspeccion.meta;

  function manejarResultado(esBuena: boolean, cantidad: number) {
    setRacha((r) => (esBuena ? r + cantidad : 0));
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <button
        onClick={() => router.push("/estacion")}
        className="text-xs font-semibold text-navy-400 hover:text-navy-700"
      >
        ← Mi estación
      </button>

      <div className="card overflow-hidden border-none bg-gradient-to-br from-navy-800 to-navy-900 text-white shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow">
              {inspeccion.planta ?? "Pieza"}
            </p>
            <h1 className="font-display text-2xl font-bold">
              {inspeccion.numeroParte ?? inspeccion.nombre}
            </h1>
          </div>
          {racha >= 3 && (
            <span className="badge animate-pulse bg-yellow text-navy-900">🔥 Racha x{racha}</span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-white/10 py-4">
            <p className="font-display text-5xl font-extrabold text-green-400">
              {inspeccion.piezasBuenas}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">
              ✅ Buenas
            </p>
          </div>
          <div className="rounded-xl bg-white/10 py-4">
            <p className="font-display text-5xl font-extrabold text-red-400">
              {inspeccion.piezasMalas}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">
              ❌ Malas
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1 flex justify-between text-xs font-semibold text-white/70">
            <span>🎯 Meta</span>
            <span>
              {total} / {inspeccion.meta || "—"} ({progreso.toFixed(0)}%)
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-yellow-600 to-yellow transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
          {metaCumplida && (
            <p className="mt-2 text-center text-sm font-bold text-yellow">🏆 ¡Meta cumplida!</p>
          )}
        </div>
      </div>

      {puedeCapturar && (
        <CapturaPanel
          inspeccionId={id}
          onCapturado={recargar}
          mostrarExtras
          onResultado={manejarResultado}
        />
      )}

      {asignado && !inspeccion.cerrado && <EstadoInspectorPanel />}

      {(inspeccion.instrucciones || inspeccion.instruccionesPdfUrl) && (
        <details className="card">
          <summary className="cursor-pointer font-display font-semibold text-navy-900">
            Ver criterio de aceptación
          </summary>
          {inspeccion.instrucciones && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-navy-600">
              {inspeccion.instrucciones}
            </p>
          )}
          {inspeccion.instruccionesPdfUrl && (
            <a
              href={inspeccion.instruccionesPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-navy underline"
            >
              Ver PDF de instrucción de trabajo
            </a>
          )}
        </details>
      )}

      {inspeccion.cerrado && (
        <div className="card bg-navy-50 text-center">
          <p className="text-sm text-navy-700">
            🏁 Esta inspección ya está cerrada. ¡Buen trabajo!
          </p>
        </div>
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

function ContadorPiezas({
  cantidad,
  onCambiar,
  disabled,
  colorTexto,
}: {
  cantidad: number;
  onCambiar: (nuevo: number) => void;
  disabled?: boolean;
  colorTexto: string;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      {[-10, -1].map((paso) => (
        <button
          key={paso}
          type="button"
          disabled={disabled}
          onClick={() => onCambiar(Math.max(0, cantidad + paso))}
          className="flex h-10 min-w-[2.75rem] items-center justify-center rounded-lg border border-navy-200 bg-white px-2 text-sm font-bold text-navy-700 transition hover:bg-navy-50 disabled:opacity-40"
        >
          {paso}
        </button>
      ))}
      <span
        className={`mx-1 w-14 text-center font-display text-2xl font-extrabold ${colorTexto}`}
      >
        {cantidad}
      </span>
      {[1, 10, 100].map((paso) => (
        <button
          key={paso}
          type="button"
          disabled={disabled}
          onClick={() => onCambiar(cantidad + paso)}
          className="flex h-10 min-w-[2.75rem] items-center justify-center rounded-lg border border-navy-200 bg-white px-2 text-sm font-bold text-navy-700 transition hover:bg-navy-50 disabled:opacity-40"
        >
          +{paso}
        </button>
      ))}
    </div>
  );
}

function CapturaPanel({
  inspeccionId,
  onCapturado,
  mostrarExtras,
  onResultado,
}: {
  inspeccionId: string;
  onCapturado: () => void;
  mostrarExtras: boolean;
  onResultado?: (esBuena: boolean, cantidad: number) => void;
}) {
  const [cantidadBuena, setCantidadBuena] = useState(0);
  const [cantidadMala, setCantidadMala] = useState(0);
  const [defecto, setDefecto] = useState<string>(DEFECTOS_COMUNES[0]);
  const [foto, setFoto] = useState<File | null>(null);
  const [enviandoBuena, setEnviandoBuena] = useState(false);
  const [enviandoMala, setEnviandoMala] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [estacion, setEstacion] = useState<string | null>(null);
  const [hoy, setHoy] = useState<{ buenas: number; malas: number } | null>(null);
  const [llamandoApoyo, setLlamandoApoyo] = useState(false);
  const [apoyoAvisado, setApoyoAvisado] = useState(false);
  const [popBuena, setPopBuena] = useState<number | null>(null);
  const [popMala, setPopMala] = useState<number | null>(null);

  const cargarHoy = useCallback(() => {
    if (!mostrarExtras) return;
    fetch(`/api/inspecciones/${inspeccionId}/hoy`)
      .then((r) => r.json())
      .then(setHoy);
  }, [inspeccionId, mostrarExtras]);

  useEffect(() => {
    if (!mostrarExtras) return;
    fetch("/api/estado")
      .then((r) => r.json())
      .then((d) => setEstacion(d?.estacion ?? null));
    cargarHoy();
  }, [mostrarExtras, cargarHoy]);

  async function llamarApoyo() {
    setLlamandoApoyo(true);
    await fetch("/api/apoyo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspeccionId }),
    });
    setLlamandoApoyo(false);
    setApoyoAvisado(true);
    setTimeout(() => setApoyoAvisado(false), 15000);
  }

  async function registrarBuenas() {
    if (cantidadBuena <= 0) return;
    setEnviandoBuena(true);
    setError(null);
    const res = await fetch(`/api/inspecciones/${inspeccionId}/capturas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "buena", cantidad: cantidadBuena }),
    });
    setEnviandoBuena(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo registrar la pieza");
      return;
    }
    onCapturado();
    cargarHoy();
    onResultado?.(true, cantidadBuena);
    setPopBuena(cantidadBuena);
    setTimeout(() => setPopBuena(null), 900);
    setCantidadBuena(0);
  }

  async function registrarMalas(e: React.FormEvent) {
    e.preventDefault();
    if (cantidadMala <= 0) return;
    setEnviandoMala(true);
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
      body: JSON.stringify({ tipo: "mala", cantidad: cantidadMala, defecto, fotoUrl }),
    });
    setEnviandoMala(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo registrar la pieza");
      return;
    }
    setFoto(null);
    if (inputRef.current) inputRef.current.value = "";
    onCapturado();
    cargarHoy();
    onResultado?.(false, cantidadMala);
    setPopMala(cantidadMala);
    setTimeout(() => setPopMala(null), 900);
    setCantidadMala(0);
  }

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-semibold text-navy-900">Captura</h2>
        {mostrarExtras && (
          <div className="flex flex-wrap items-center gap-2">
            {estacion && <span className="badge bg-navy-50 text-navy-700">📍 {estacion}</span>}
            {hoy && (
              <span
                className={`badge ${hoy.malas > 0 ? "bg-red-50 text-red-700" : "bg-navy-50 text-navy-700"}`}
              >
                {hoy.malas} defecto{hoy.malas === 1 ? "" : "s"} hoy
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative rounded-xl border border-green-200 bg-green-50 p-3">
          {popBuena !== null && (
            <span className="animate-pop-plus pointer-events-none absolute inset-x-0 top-1 text-center text-xl font-extrabold text-green-600">
              +{popBuena}
            </span>
          )}
          <p className="mb-2 text-center text-sm font-semibold text-green-800">✅ Piezas buenas</p>
          <ContadorPiezas
            cantidad={cantidadBuena}
            onCambiar={setCantidadBuena}
            disabled={enviandoBuena}
            colorTexto="text-green-700"
          />
          <button
            type="button"
            onClick={registrarBuenas}
            disabled={enviandoBuena || cantidadBuena <= 0}
            className="mt-3 w-full rounded-lg bg-green-600 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-40"
          >
            {enviandoBuena ? "Guardando…" : `Registrar ${cantidadBuena || ""} buena${cantidadBuena === 1 ? "" : "s"}`}
          </button>
        </div>

        <div className="relative rounded-xl border border-red-200 bg-red-50 p-3">
          {popMala !== null && (
            <span className="animate-pop-plus pointer-events-none absolute inset-x-0 top-1 text-center text-xl font-extrabold text-red-600">
              +{popMala}
            </span>
          )}
          <p className="mb-2 text-center text-sm font-semibold text-red-800">❌ Piezas malas</p>
          <ContadorPiezas
            cantidad={cantidadMala}
            onCambiar={setCantidadMala}
            disabled={enviandoMala}
            colorTexto="text-red-700"
          />
          <form onSubmit={registrarMalas} className="mt-3 space-y-2">
            <select className="input" value={defecto} onChange={(e) => setDefecto(e.target.value)}>
              {DEFECTOS_COMUNES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <input
              ref={inputRef}
              className="input text-xs"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            />
            <button
              type="submit"
              disabled={enviandoMala || cantidadMala <= 0}
              className="w-full rounded-lg bg-red-600 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-40"
            >
              {enviandoMala ? "Guardando…" : `Registrar ${cantidadMala || ""} mala${cantidadMala === 1 ? "" : "s"}`}
            </button>
          </form>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {mostrarExtras && (
        <button
          type="button"
          onClick={llamarApoyo}
          disabled={llamandoApoyo || apoyoAvisado}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-60"
        >
          {apoyoAvisado
            ? "✓ Se avisó a liderazgo"
            : llamandoApoyo
              ? "Avisando…"
              : "🔔 Llamar líder / supervisor"}
        </button>
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

function EditarModal({
  inspeccionId,
  inspeccion,
  onCerrar,
  onGuardado,
}: {
  inspeccionId: string;
  inspeccion: Inspeccion;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(inspeccion.nombre);
  const [numeroParte, setNumeroParte] = useState(inspeccion.numeroParte ?? "");
  const [cliente, setCliente] = useState(inspeccion.cliente ?? "");
  const [planta, setPlanta] = useState(inspeccion.planta ?? "");
  const [meta, setMeta] = useState(inspeccion.meta ? String(inspeccion.meta) : "");
  const [fechaEntrega, setFechaEntrega] = useState(
    inspeccion.fechaEntrega ? inspeccion.fechaEntrega.slice(0, 10) : ""
  );
  const [instrucciones, setInstrucciones] = useState(inspeccion.instrucciones ?? "");
  const [instruccionesPdfUrl, setInstruccionesPdfUrl] = useState(
    inspeccion.instruccionesPdfUrl ?? ""
  );
  const [inspectorIds, setInspectorIds] = useState<string[]>(
    inspeccion.inspectores.map((a) => a.usuario.id)
  );
  const [inspectores, setInspectores] = useState<{ id: string; nombre: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/usuarios/inspectores")
      .then((r) => r.json())
      .then(setInspectores);
  }, []);

  function alternarInspector(idInspector: string) {
    setInspectorIds((prev) =>
      prev.includes(idInspector) ? prev.filter((x) => x !== idInspector) : [...prev, idInspector]
    );
  }

  async function manejarEnvio(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/inspecciones/${inspeccionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        numeroParte: numeroParte || null,
        cliente: cliente || null,
        planta: planta || null,
        meta: meta ? Number(meta) : 0,
        fechaEntrega: fechaEntrega ? new Date(fechaEntrega).toISOString() : null,
        instrucciones: instrucciones || null,
        instruccionesPdfUrl: instruccionesPdfUrl || null,
        inspectorIds,
      }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo guardar la inspección");
      return;
    }
    onGuardado();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-navy-900/60 px-4 py-8">
      <form
        onSubmit={manejarEnvio}
        className="w-full max-w-lg space-y-3 rounded-xl bg-white p-5 shadow-lg"
      >
        <h2 className="font-display text-lg font-bold text-navy-900">Editar inspección</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nombre</label>
            <input
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label">Número de parte</label>
            <input className="input" value={numeroParte} onChange={(e) => setNumeroParte(e.target.value)} />
          </div>
          <div>
            <label className="label">Cliente</label>
            <input className="input" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
          <div>
            <label className="label">Planta</label>
            <select className="input" value={planta} onChange={(e) => setPlanta(e.target.value)}>
              <option value="">Selecciona una planta</option>
              {PLANTAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Meta de piezas</label>
            <input
              className="input"
              type="number"
              min={0}
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Fecha de entrega</label>
            <input
              className="input"
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Instrucción de trabajo / criterio de aceptación</label>
            <textarea
              className="input"
              rows={3}
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">PDF de instrucción de trabajo (opcional)</label>
            <SubidaPdf url={instruccionesPdfUrl} onCambiar={setInstruccionesPdfUrl} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Inspectores asignados</label>
            <div className="flex flex-wrap gap-2">
              {inspectores.length === 0 && (
                <p className="text-xs text-navy-400">No hay inspectores dados de alta todavía.</p>
              )}
              {inspectores.map((insp) => (
                <button
                  type="button"
                  key={insp.id}
                  onClick={() => alternarInspector(insp.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    inspectorIds.includes(insp.id)
                      ? "border-navy bg-navy text-white"
                      : "border-navy-200 text-navy-600"
                  }`}
                >
                  {insp.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar cambios"}
          </button>
          <button type="button" className="btn-secondary" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
