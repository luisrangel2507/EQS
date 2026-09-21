"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InspeccionResumen = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  cliente: string | null;
  planta: string | null;
};

type InspeccionDetalle = InspeccionResumen & {
  instrucciones: string | null;
  instruccionesPdfUrl: string | null;
  defectos: { tipo: string; cantidad: number }[];
};

export default function EstacionClient({
  nombre,
  inspecciones,
  detalleInicial,
}: {
  nombre: string;
  inspecciones: InspeccionResumen[];
  detalleInicial: InspeccionDetalle | null;
}) {
  const router = useRouter();
  const [detalle, setDetalle] = useState<InspeccionDetalle | null>(detalleInicial);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  async function elegir(id: string) {
    setCargandoDetalle(true);
    const res = await fetch(`/api/inspecciones/${id}`);
    setCargandoDetalle(false);
    if (!res.ok) return;
    const d = await res.json();
    setDetalle({
      id: d.id,
      nombre: d.nombre,
      numeroParte: d.numeroParte,
      cliente: d.cliente,
      planta: d.planta,
      instrucciones: d.instrucciones,
      instruccionesPdfUrl: d.instruccionesPdfUrl,
      defectos: [...d.defectos].sort((a, b) => b.cantidad - a.cantidad).slice(0, 3),
    });
  }

  if (detalle) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="card space-y-4">
          <div>
            <h1 className="font-display text-xl font-bold text-navy-900">
              ¡Hola {nombre.split(" ")[0]}, esto vas a inspeccionar!
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
            {detalle.defectos.length > 0 ? (
              <ul className="list-inside list-disc text-sm text-navy-700">
                {detalle.defectos.map((d) => (
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
            {inspecciones.length > 0 && (
              <button className="btn-secondary" onClick={() => setDetalle(null)}>
                Cambiar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (inspecciones.length === 0) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card space-y-2 text-center">
          <p className="font-display text-lg font-bold text-navy-900">
            Hola {nombre.split(" ")[0]} 👋
          </p>
          <p className="text-sm text-navy-600">
            Todavía no tienes ninguna inspección asignada. Pídele a tu líder o supervisor que te
            asigne una para poder empezar a capturar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="card space-y-3">
        <h1 className="font-display text-xl font-bold text-navy-900">
          Hola {nombre.split(" ")[0]}, elige tu inspección
        </h1>
        <div className="space-y-2">
          {inspecciones.map((i) => (
            <button
              key={i.id}
              type="button"
              disabled={cargandoDetalle}
              onClick={() => elegir(i.id)}
              className="flex w-full items-center justify-between rounded-lg border border-navy-200 px-4 py-3 text-left text-sm transition hover:border-navy hover:bg-navy-50 disabled:opacity-60"
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
              <span className="text-navy">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
