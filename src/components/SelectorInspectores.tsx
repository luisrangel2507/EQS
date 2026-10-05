"use client";

import { useEffect, useState } from "react";

type Inspector = { id: string; nombre: string; requiereCertificacion: boolean; certificado: boolean | null };

/** Chips de inspectores; si el número de parte exige certificación, bloquea a quien no la tenga. */
export default function SelectorInspectores({
  numeroParte,
  seleccionados,
  onCambiar,
}: {
  numeroParte: string;
  seleccionados: string[];
  onCambiar: (ids: string[]) => void;
}) {
  const [inspectores, setInspectores] = useState<Inspector[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/usuarios/inspectores${numeroParte.trim() ? `?numeroParte=${encodeURIComponent(numeroParte.trim())}` : ""}`)
        .then((r) => r.json())
        .then(setInspectores)
        .catch(() => setInspectores([]));
    }, 300);
    return () => clearTimeout(t);
  }, [numeroParte]);

  if (inspectores === null) return <div className="skeleton h-8 w-full rounded-lg" />;
  if (inspectores.length === 0) return <p className="text-xs text-navy-400">No hay inspectores dados de alta todavía.</p>;

  const requiere = inspectores[0]?.requiereCertificacion;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {inspectores.map((i) => {
          const elegido = seleccionados.includes(i.id);
          // quien ya estaba asignado se puede quitar aunque no esté certificado
          const bloqueado = requiere && !i.certificado && !elegido;
          return (
            <button
              type="button"
              key={i.id}
              disabled={bloqueado}
              title={bloqueado ? `Sin certificación vigente en ${numeroParte}` : undefined}
              onClick={() => onCambiar(elegido ? seleccionados.filter((x) => x !== i.id) : [...seleccionados, i.id])}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                elegido
                  ? "border-navy bg-navy text-white"
                  : bloqueado
                    ? "cursor-not-allowed border-dashed border-navy-200 text-navy-300"
                    : "border-navy-200 text-navy-600 hover:bg-navy-50"
              }`}
            >
              {i.nombre}
            </button>
          );
        })}
      </div>
      {requiere && (
        <p className="text-xs text-navy-400">
          {numeroParte} requiere certificación: solo se puede asignar a inspectores certificados.
        </p>
      )}
    </div>
  );
}
