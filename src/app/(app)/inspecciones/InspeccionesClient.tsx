"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Rol } from "@prisma/client";
import { PLANTAS } from "@/lib/constants";
import ClienteSelect from "@/components/ClienteSelect";
import SubidaPdf from "@/components/SubidaPdf";

type Inspeccion = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  cliente: string | null;
  planta: string | null;
  meta: number;
  precioPorPieza: number;
  fechaEntrega: string | null;
  piezasBuenas: number;
  piezasMalas: number;
  cerrado: boolean;
  inspectores: { usuario: { id: string; nombre: string } }[];
};

export default function InspeccionesClient({ rol }: { rol: Rol }) {
  const esInspector = rol === "INSPECTOR";
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [filtro, setFiltro] = useState<"todas" | "activas" | "cerradas">("activas");
  // Para el inspector, Historial es solo lo cerrado: lo activo ya vive en "Mis inspecciones".
  const filtroEfectivo = esInspector ? "cerradas" : filtro;

  const puedeCrear = rol === "ADMIN" || rol === "SUPERVISOR";

  const cargar = useCallback(async () => {
    const res = await fetch("/api/inspecciones");
    if (res.ok) setInspecciones(await res.json());
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtradas = inspecciones.filter((i) => {
    if (filtroEfectivo === "activas") return !i.cerrado;
    if (filtroEfectivo === "cerradas") return i.cerrado;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-navy-900">
          {esInspector ? "Historial de inspecciones" : "Inspecciones"}
        </h1>
        {puedeCrear && (
          <button className="btn-primary" onClick={() => setMostrarForm(true)}>
            + Nueva inspección
          </button>
        )}
      </div>

      {!esInspector && (
        <div className="flex gap-2">
          {(["activas", "cerradas", "todas"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filtro === f ? "bg-navy text-white" : "bg-white text-navy-500 border border-navy-200"
              }`}
            >
              {f === "activas" ? "Activas" : f === "cerradas" ? "Cerradas" : "Todas"}
            </button>
          ))}
        </div>
      )}

      {mostrarForm && (
        <NuevaInspeccionForm
          onCerrar={() => setMostrarForm(false)}
          onCreada={() => {
            setMostrarForm(false);
            cargar();
          }}
        />
      )}

      {cargando ? (
        <p className="text-sm text-navy-500">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <p className="text-sm text-navy-500">No hay inspecciones para mostrar.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((i) => {
            const total = i.piezasBuenas + i.piezasMalas;
            const rechazo = total > 0 ? i.piezasMalas / total : 0;
            const progreso = i.meta > 0 ? Math.min(100, (total / i.meta) * 100) : 0;
            return (
              <Link key={i.id} href={`/inspecciones/${i.id}`} className="card block hover:shadow-md">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-display font-semibold text-navy-900">{i.nombre}</h3>
                  <span
                    className={`badge ${i.cerrado ? "bg-navy-100 text-navy-500" : "bg-green-100 text-green-800"}`}
                  >
                    {i.cerrado ? "Cerrada" : "Activa"}
                  </span>
                </div>
                <p className="text-xs text-navy-500">
                  {i.numeroParte ?? "Sin número de parte"} · {i.planta ?? "Sin planta"}
                </p>
                {i.cliente && <p className="text-xs text-navy-500">Cliente: {i.cliente}</p>}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-navy-700">
                    {total} / {i.meta || "—"} piezas
                  </span>
                  <span className={rechazo >= 0.08 ? "font-semibold text-red-600" : "text-navy-600"}>
                    {(rechazo * 100).toFixed(1)}% rechazo
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-navy-100">
                  <div
                    className="h-1.5 rounded-full bg-yellow"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
                {i.inspectores.length > 0 && (
                  <p className="mt-2 truncate text-xs text-navy-400">
                    {i.inspectores.map((a) => a.usuario.nombre).join(", ")}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NuevaInspeccionForm({ onCerrar, onCreada }: { onCerrar: () => void; onCreada: () => void }) {
  const [nombre, setNombre] = useState("");
  const [numeroParte, setNumeroParte] = useState("");
  const [cliente, setCliente] = useState("");
  const [planta, setPlanta] = useState("");
  const [puntoLimpio, setPuntoLimpio] = useState("");
  const [meta, setMeta] = useState("");
  const [precioPorPieza, setPrecioPorPieza] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [instrucciones, setInstrucciones] = useState("");
  const [instruccionesPdfUrl, setInstruccionesPdfUrl] = useState("");
  const [inspectorIds, setInspectorIds] = useState<string[]>([]);
  const [inspectores, setInspectores] = useState<{ id: string; nombre: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/usuarios/inspectores")
      .then((r) => r.json())
      .then(setInspectores);
  }, []);

  function alternarInspector(id: string) {
    setInspectorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function manejarEnvio(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/inspecciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        numeroParte: numeroParte || undefined,
        cliente: cliente || undefined,
        planta: planta || undefined,
        puntoLimpio: puntoLimpio || undefined,
        meta: meta ? Number(meta) : undefined,
        precioPorPieza: precioPorPieza ? Number(precioPorPieza) : undefined,
        fechaEntrega: fechaEntrega ? new Date(fechaEntrega).toISOString() : undefined,
        instrucciones: instrucciones || undefined,
        instruccionesPdfUrl: instruccionesPdfUrl || undefined,
        inspectorIds,
      }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo crear la inspección");
      return;
    }
    onCreada();
  }

  return (
    <form onSubmit={manejarEnvio} className="card space-y-3">
      <h2 className="font-display font-semibold text-navy-900">Nueva inspección</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nombre</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={2} />
        </div>
        <div>
          <label className="label">Número de parte</label>
          <input className="input" value={numeroParte} onChange={(e) => setNumeroParte(e.target.value)} />
        </div>
        <div>
          <label className="label">Cliente</label>
          <ClienteSelect value={cliente} onChange={setCliente} />
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
          <label className="label">Punto Limpio (identificación)</label>
          <input
            className="input"
            placeholder="Ej. Mesa 3"
            value={puntoLimpio}
            onChange={(e) => setPuntoLimpio(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Meta de piezas</label>
          <input className="input" type="number" min={0} value={meta} onChange={(e) => setMeta(e.target.value)} />
        </div>
        <div>
          <label className="label">Precio por pieza (facturación)</label>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            value={precioPorPieza}
            onChange={(e) => setPrecioPorPieza(e.target.value)}
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
          {enviando ? "Creando…" : "Crear inspección"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCerrar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
