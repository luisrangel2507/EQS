"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type InspeccionResumen = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  cliente: string | null;
  planta: string | null;
  cerrado: boolean;
};

export default function EstacionClient({ nombre }: { nombre: string }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [inspecciones, setInspecciones] = useState<InspeccionResumen[]>([]);

  useEffect(() => {
    fetch("/api/inspecciones")
      .then((r) => r.json())
      .then((insp: InspeccionResumen[]) => {
        const abiertas = insp.filter((i) => !i.cerrado);
        setInspecciones(abiertas);
        if (abiertas.length === 1) {
          router.replace(`/inspecciones/${abiertas[0].id}`);
        }
      })
      .finally(() => setCargando(false));
  }, [router]);

  if (cargando || inspecciones.length === 1) {
    return <p className="text-sm text-navy-500">Cargando tu inspección…</p>;
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
              onClick={() => router.push(`/inspecciones/${i.id}`)}
              className="flex w-full items-center justify-between rounded-lg border border-navy-200 px-4 py-3 text-left text-sm transition hover:border-navy hover:bg-navy-50"
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
