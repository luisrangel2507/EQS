"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ESTACIONES } from "@/lib/constants";

type InspeccionResumen = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  cliente: string | null;
  planta: string | null;
  cerrado: boolean;
};

type InspeccionDetalle = InspeccionResumen & {
  instrucciones: string | null;
  instruccionesPdfUrl: string | null;
  defectos: { tipo: string; cantidad: number }[];
};

export default function EstacionClient({ nombre }: { nombre: string }) {
  const router = useRouter();
  const [paso, setPaso] = useState<"seleccion" | "briefing">("seleccion");
  const [cargando, setCargando] = useState(true);
  const [estacion, setEstacion] = useState<string>("");
  const [inspecciones, setInspecciones] = useState<InspeccionResumen[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<InspeccionDetalle | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/estado").then((r) => r.json()),
      fetch("/api/inspecciones").then((r) => r.json()),
    ])
      .then(([est, insp]: [{ estacion: string | null } | null, InspeccionResumen[]]) => {
        if (est?.estacion) setEstacion(est.estacion);
        const abiertas = insp.filter((i) => !i.cerrado);
        setInspecciones(abiertas);
        if (abiertas.length === 1) setSeleccionadaId(abiertas[0].id);
      })
      .finally(() => setCargando(false));
  }, []);

  const filtradas = inspecciones.filter((i) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.trim().toLowerCase();
    return (
      i.numeroParte?.toLowerCase().includes(q) ||
      i.cliente?.toLowerCase().includes(q) ||
      i.nombre.toLowerCase().includes(q)
    );
  });

  async function confirmar() {
    if (!estacion || !seleccionadaId) return;
    setConfirmando(true);
    setError(null);
    try {
      await fetch("/api/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estacion }),
      });
      const res = await fetch(`/api/inspecciones/${seleccionadaId}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setDetalle(d);
      setPaso("briefing");
    } catch {
      setError("No se pudo cargar la inspección, intenta de nuevo");
    } finally {
      setConfirmando(false);
    }
  }

  if (cargando) {
    return <p className="text-sm text-navy-500">Cargando…</p>;
  }

  if (paso === "briefing" && detalle) {
    const topDefectos = [...detalle.defectos].sort((a, b) => b.cantidad - a.cantidad).slice(0, 3);
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="card space-y-4">
          <div>
            <p className="label">📍 {estacion}</p>
            <h1 className="font-display text-xl font-bold text-navy-900">
              Hola {nombre.split(" ")[0]}, esto vas a inspeccionar
            </h1>
          </div>

          <div className="rounded-lg bg-navy-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
              Número de parte
            </p>
            <p className="font-display text-lg font-bold text-navy-900">
              {detalle.numeroParte ?? detalle.nombre}
            </p>
            {detalle.cliente && <p className="text-sm text-navy-500">Cliente: {detalle.cliente}</p>}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-500">
              Principales defectos a vigilar
            </p>
            {topDefectos.length > 0 ? (
              <ul className="list-inside list-disc text-sm text-navy-700">
                {topDefectos.map((d) => (
                  <li key={d.tipo}>{d.tipo}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-navy-400">Todavía no hay historial de defectos para esta pieza.</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-500">
              Criterio de aceptación
            </p>
            {detalle.instrucciones ? (
              <p className="whitespace-pre-wrap text-sm text-navy-700">{detalle.instrucciones}</p>
            ) : (
              <p className="text-sm text-navy-400">Sin instrucción de texto para esta pieza.</p>
            )}
            {detalle.instruccionesPdfUrl && (
              <a
                href={detalle.instruccionesPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm font-semibold text-navy underline"
              >
                Ver PDF de instrucción de trabajo
              </a>
            )}
          </div>

          <div className="flex gap-2">
            <button
              className="btn-accent flex-1"
              onClick={() => router.push(`/inspecciones/${detalle.id}`)}
            >
              Comenzar inspección
            </button>
            <button className="btn-secondary" onClick={() => setPaso("seleccion")}>
              Cambiar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="card space-y-4">
        <h1 className="font-display text-xl font-bold text-navy-900">📍 Mi estación de trabajo</h1>

        <div>
          <label className="label">Selecciona tu estación</label>
          <div className="space-y-2">
            {ESTACIONES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEstacion(e)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
                  estacion === e
                    ? "border-green-400 bg-green-50 text-green-900"
                    : "border-navy-200 text-navy-700 hover:bg-navy-50"
                }`}
              >
                <span>📍 {e}</span>
                {estacion === e && <span className="text-green-600">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">No. de parte que inspecciono</label>
          <input
            className="input mb-2"
            placeholder="Buscar NP o cliente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {filtradas.length === 0 && (
              <p className="text-sm text-navy-400">
                {inspecciones.length === 0
                  ? "No tienes inspecciones asignadas por ahora."
                  : "Sin resultados para esa búsqueda."}
              </p>
            )}
            {filtradas.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setSeleccionadaId(i.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition ${
                  seleccionadaId === i.id
                    ? "border-navy bg-navy-50"
                    : "border-navy-200 hover:bg-navy-50"
                }`}
              >
                <span>
                  <span className="block font-semibold text-navy-900">
                    {i.numeroParte ?? i.nombre}
                  </span>
                  <span className="block text-xs text-navy-500">
                    {i.nombre}
                    {i.cliente ? ` · ${i.cliente}` : ""}
                    {i.planta ? ` · ${i.planta}` : ""}
                  </span>
                </span>
                {seleccionadaId === i.id && <span className="text-navy">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          className="btn-accent w-full"
          disabled={!estacion || !seleccionadaId || confirmando}
          onClick={confirmar}
        >
          {confirmando ? "Cargando…" : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
