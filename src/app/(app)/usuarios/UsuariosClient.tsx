"use client";

import { useEffect, useState, useCallback } from "react";
import { ROLES, ROL_ETIQUETAS, PLANTAS } from "@/lib/constants";

type Usuario = {
  id: string;
  nombre: string;
  usuario: string;
  rol: (typeof ROLES)[number];
  clienteNombre: string | null;
  esResidente: boolean;
  plantaResidente: string | null;
  activo: boolean;
  creadoEn: string;
};

export default function UsuariosClient({ usuarioActualId }: { usuarioActualId: string }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/usuarios");
    if (res.ok) setUsuarios(await res.json());
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function actualizar(
    id: string,
    cambios: Partial<{ rol: string; activo: boolean; esResidente: boolean; plantaResidente: string | null }>
  ) {
    setError(null);
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo actualizar el usuario");
      return;
    }
    cargar();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-900">Usuarios</h1>
        <button className="btn-primary" onClick={() => setMostrarForm(true)}>
          + Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {mostrarForm && (
        <NuevoUsuarioForm
          onCerrar={() => setMostrarForm(false)}
          onCreado={() => {
            setMostrarForm(false);
            cargar();
          }}
        />
      )}

      <div className="card overflow-x-auto p-0">
        {cargando ? (
          <p className="p-5 text-sm text-navy-500">Cargando…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-left text-xs uppercase text-navy-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Residente</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-navy-900">{u.nombre}</td>
                  <td className="px-4 py-3 text-navy-600">{u.usuario}</td>
                  <td className="px-4 py-3">
                    <select
                      className="input py-1"
                      value={u.rol}
                      disabled={u.id === usuarioActualId}
                      onChange={(e) => actualizar(u.id, { rol: e.target.value })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROL_ETIQUETAS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-navy-600">{u.clienteNombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    <ResidenteCelda usuario={u} onCambiar={(cambios) => actualizar(u.id, cambios)} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${u.activo ? "bg-green-100 text-green-800" : "bg-navy-100 text-navy-500"}`}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== usuarioActualId && (
                      <button
                        className="text-xs font-semibold text-navy-500 hover:text-navy-900"
                        onClick={() => actualizar(u.id, { activo: !u.activo })}
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                    )}
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

function ResidenteCelda({
  usuario,
  onCambiar,
}: {
  usuario: Usuario;
  onCambiar: (cambios: { esResidente: boolean; plantaResidente: string | null }) => void;
}) {
  const [planta, setPlanta] = useState<string>(usuario.plantaResidente ?? PLANTAS[0]);

  if (!usuario.esResidente) {
    return (
      <button
        className="text-xs font-semibold text-navy-400 hover:text-navy-700"
        onClick={() => onCambiar({ esResidente: true, plantaResidente: planta })}
      >
        + Marcar residente
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="badge bg-purple-100 text-purple-800">🏭 {usuario.plantaResidente ?? planta}</span>
      <select
        className="input py-0.5 text-xs"
        value={planta}
        onChange={(e) => {
          setPlanta(e.target.value);
          onCambiar({ esResidente: true, plantaResidente: e.target.value });
        }}
      >
        {PLANTAS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <button
        className="text-xs font-semibold text-navy-400 hover:text-red-600"
        onClick={() => onCambiar({ esResidente: false, plantaResidente: null })}
      >
        Quitar
      </button>
    </div>
  );
}

function NuevoUsuarioForm({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: () => void }) {
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<(typeof ROLES)[number]>("INSPECTOR");
  const [clienteNombre, setClienteNombre] = useState("");
  const [esResidente, setEsResidente] = useState(false);
  const [plantaResidente, setPlantaResidente] = useState<string>(PLANTAS[0]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarEnvio(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        usuario,
        password,
        rol,
        clienteNombre: rol === "CLIENTE" ? clienteNombre : undefined,
        esResidente: rol !== "CLIENTE" ? esResidente : undefined,
        plantaResidente: rol !== "CLIENTE" && esResidente ? plantaResidente : undefined,
      }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo crear el usuario");
      return;
    }
    onCreado();
  }

  return (
    <form onSubmit={manejarEnvio} className="card space-y-3">
      <h2 className="font-display font-semibold text-navy-900">Nuevo usuario</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nombre completo</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={2} />
        </div>
        <div>
          <label className="label">Usuario (login)</label>
          <input className="input" value={usuario} onChange={(e) => setUsuario(e.target.value)} required minLength={3} />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <div>
          <label className="label">Rol</label>
          <select className="input" value={rol} onChange={(e) => setRol(e.target.value as (typeof ROLES)[number])}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROL_ETIQUETAS[r]}
              </option>
            ))}
          </select>
        </div>
        {rol === "CLIENTE" && (
          <div className="sm:col-span-2">
            <label className="label">Nombre de cliente (debe coincidir con el campo &quot;cliente&quot; de las inspecciones)</label>
            <input className="input" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} required />
          </div>
        )}
        {rol !== "CLIENTE" && (
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="es-residente"
              type="checkbox"
              checked={esResidente}
              onChange={(e) => setEsResidente(e.target.checked)}
            />
            <label htmlFor="es-residente" className="text-sm text-navy-700">
              Es Residente (asignado de forma fija a la planta de un cliente)
            </label>
          </div>
        )}
        {rol !== "CLIENTE" && esResidente && (
          <div>
            <label className="label">Planta asignada</label>
            <select className="input" value={plantaResidente} onChange={(e) => setPlantaResidente(e.target.value)}>
              {PLANTAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? "Creando…" : "Crear usuario"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCerrar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
