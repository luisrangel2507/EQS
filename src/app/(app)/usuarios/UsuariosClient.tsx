"use client";

import { useEffect, useState, useCallback } from "react";
import { ROLES, ROL_ETIQUETAS, ROL_SELLO, PLANTAS } from "@/lib/constants";

type Usuario = {
  id: string;
  nombre: string;
  usuario: string;
  rol: (typeof ROLES)[number];
  clienteNombre: string | null;
  plantaResidente: string | null;
  activo: boolean;
  creadoEn: string;
};

type Empresa = { id: string; nombre: string; activa: boolean };

export default function UsuariosClient({ usuarioActualId }: { usuarioActualId: string }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
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
    fetch("/api/empresas")
      .then((r) => r.json())
      .then(setEmpresas);
  }, [cargar]);

  const empresasActivas = empresas.filter((e) => e.activa);

  async function actualizar(
    id: string,
    cambios: Partial<{ rol: string; activo: boolean; plantaResidente: string | null; clienteNombre: string | null }>
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
          empresas={empresasActivas}
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
                <th className="px-4 py-3">Posición</th>
                <th className="px-4 py-3">Cliente / Planta</th>
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
                    <SelloRol
                      rol={u.rol}
                      disabled={u.id === usuarioActualId}
                      onCambiar={(rol) => actualizar(u.id, { rol })}
                    />
                  </td>
                  <td className="px-4 py-3 text-navy-600">
                    {u.rol === "CLIENTE" ? (
                      <ClienteCelda
                        clienteNombre={u.clienteNombre}
                        empresas={empresasActivas}
                        onCambiar={(clienteNombre) => actualizar(u.id, { clienteNombre })}
                      />
                    ) : u.rol === "RESIDENTE" ? (
                      <PlantaCelda
                        planta={u.plantaResidente}
                        onCambiar={(plantaResidente) => actualizar(u.id, { plantaResidente })}
                      />
                    ) : (
                      "—"
                    )}
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

function SelloRol({
  rol,
  disabled,
  onCambiar,
}: {
  rol: (typeof ROLES)[number];
  disabled?: boolean;
  onCambiar: (rol: string) => void;
}) {
  const sello = ROL_SELLO[rol];
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 shadow-sm ring-1 ring-black/10 ${sello?.clase ?? "bg-navy-100"} ${disabled ? "opacity-70" : ""}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-sm">
        {sello?.icono}
      </span>
      <select
        className="cursor-pointer border-none bg-transparent text-xs font-bold text-white outline-none disabled:cursor-not-allowed"
        value={rol}
        disabled={disabled}
        onChange={(e) => onCambiar(e.target.value)}
      >
        {ROLES.map((r) => (
          <option key={r} value={r} className="bg-white text-navy-900">
            {ROL_ETIQUETAS[r]}
          </option>
        ))}
      </select>
    </div>
  );
}

function PlantaCelda({
  planta,
  onCambiar,
}: {
  planta: string | null;
  onCambiar: (planta: string) => void;
}) {
  return (
    <select
      className="input py-1 text-xs"
      value={planta ?? PLANTAS[0]}
      onChange={(e) => onCambiar(e.target.value)}
    >
      {PLANTAS.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

function ClienteCelda({
  clienteNombre,
  empresas,
  onCambiar,
}: {
  clienteNombre: string | null;
  empresas: Empresa[];
  onCambiar: (clienteNombre: string) => void;
}) {
  if (empresas.length === 0) {
    return <span className="text-xs text-navy-400">Da de alta una empresa primero</span>;
  }
  const coincide = clienteNombre !== null && empresas.some((e) => e.nombre === clienteNombre);
  return (
    <div className="space-y-1">
      {clienteNombre && !coincide && (
        <p className="text-[11px] text-amber-600">
          &quot;{clienteNombre}&quot; ya no está activa
        </p>
      )}
      <select
        className="input py-1 text-xs"
        value={coincide ? clienteNombre! : ""}
        onChange={(e) => onCambiar(e.target.value)}
      >
        <option value="" disabled>
          Selecciona una empresa
        </option>
        {empresas.map((e) => (
          <option key={e.id} value={e.nombre}>
            {e.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

function NuevoUsuarioForm({
  empresas,
  onCerrar,
  onCreado,
}: {
  empresas: Empresa[];
  onCerrar: () => void;
  onCreado: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<(typeof ROLES)[number]>("INSPECTOR");
  const [clienteNombre, setClienteNombre] = useState("");
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
        plantaResidente: rol === "RESIDENTE" ? plantaResidente : undefined,
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
          <label className="label">Posición</label>
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
            <label className="label">Empresa</label>
            {empresas.length === 0 ? (
              <p className="text-sm text-navy-500">
                Todavía no hay empresas dadas de alta. Ve a Empresas para dar de alta una primero.
              </p>
            ) : (
              <select
                className="input"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                required
              >
                <option value="" disabled>
                  Selecciona una empresa
                </option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.nombre}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        {rol === "RESIDENTE" && (
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
