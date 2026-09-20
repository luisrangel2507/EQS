"use client";

import { useEffect, useState, useCallback } from "react";

type Empresa = {
  id: string;
  nombre: string;
  activa: boolean;
  creadoEn: string;
};

export default function EmpresasClient() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/empresas");
    if (res.ok) setEmpresas(await res.json());
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo dar de alta la empresa");
      return;
    }
    setNombre("");
    cargar();
  }

  async function alternarActiva(id: string, activa: boolean) {
    setError(null);
    const res = await fetch(`/api/empresas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo actualizar la empresa");
      return;
    }
    cargar();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Empresas</h1>
        <p className="text-sm text-navy-500">
          Da de alta las empresas cliente aquí; solo se podrán asignar usuarios de tipo Cliente a
          una empresa ya registrada.
        </p>
      </div>

      <form onSubmit={crear} className="card flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Nombre de la empresa</label>
          <input
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            minLength={2}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={enviando || !nombre.trim()}>
          {enviando ? "Guardando…" : "+ Dar de alta"}
        </button>
      </form>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="card overflow-x-auto p-0">
        {cargando ? (
          <p className="p-5 text-sm text-navy-500">Cargando…</p>
        ) : empresas.length === 0 ? (
          <p className="p-5 text-sm text-navy-400">Todavía no hay empresas dadas de alta.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-left text-xs uppercase text-navy-500">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {empresas.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-navy-900">{e.nombre}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${e.activa ? "bg-green-100 text-green-800" : "bg-navy-100 text-navy-500"}`}
                    >
                      {e.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-xs font-semibold text-navy-500 hover:text-navy-900"
                      onClick={() => alternarActiva(e.id, !e.activa)}
                    >
                      {e.activa ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
