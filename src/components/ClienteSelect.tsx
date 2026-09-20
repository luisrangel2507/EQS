"use client";

import { useEffect, useState } from "react";

export type Empresa = { id: string; nombre: string; activa: boolean };

export default function ClienteSelect({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);

  useEffect(() => {
    fetch("/api/empresas")
      .then((r) => r.json())
      .then((data: Empresa[]) => setEmpresas(data.filter((e) => e.activa)));
  }, []);

  if (empresas === null) {
    return <p className="text-sm text-navy-400">Cargando empresas…</p>;
  }

  if (empresas.length === 0) {
    return (
      <p className="text-sm text-navy-500">
        Todavía no hay empresas dadas de alta. Ve a Empresas para dar de alta una primero.
      </p>
    );
  }

  const coincide = value === "" || empresas.some((e) => e.nombre === value);

  return (
    <div className="space-y-1">
      {value && !coincide && (
        <p className="text-xs text-amber-600">&quot;{value}&quot; ya no está activa</p>
      )}
      <select
        className="input"
        value={coincide ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">Sin cliente</option>
        {empresas.map((e) => (
          <option key={e.id} value={e.nombre}>
            {e.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
