"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { PLANTAS } from "@/lib/constants";
import { NOMBRE_APP } from "@/lib/branding";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { vibrar } from "@/lib/feedback";

type Contacto = { nombre: string; usuario: string; usuarioEditado: boolean };
type Credencial = { nombre: string; usuario: string; password: string };
type Resultado = { empresa: string; inspeccionId: string | null; credenciales: Credencial[] };

const PASOS = ["Empresa", "Contactos", "Primera inspección"];

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

function sugerirUsuario(nombre: string, empresa: string) {
  const partes = sinAcentos(nombre).toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "";
  const base = partes.length > 1 ? `${partes[0][0]}${partes[partes.length - 1]}` : partes[0];
  const sufijo = sinAcentos(empresa).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
  return `${base}${sufijo ? `.${sufijo}` : ""}`.replace(/[^a-z0-9._-]/g, "");
}

export default function AltaCliente({
  abierto,
  onCerrar,
  onCreado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: () => void;
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar}>
      {abierto && <Asistente onCerrar={onCerrar} onCreado={onCreado} />}
    </Modal>
  );
}

function Asistente({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: () => void }) {
  const toast = useToast();
  const [paso, setPaso] = useState(0);
  const [direccion, setDireccion] = useState(1);
  const [empresa, setEmpresa] = useState("");
  const [contactos, setContactos] = useState<Contacto[]>([{ nombre: "", usuario: "", usuarioEditado: false }]);
  const [conInspeccion, setConInspeccion] = useState(true);
  const [inspeccion, setInspeccion] = useState({ nombre: "", numeroParte: "", planta: "", precioPorPieza: "", meta: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const puedeAvanzar =
    paso === 0
      ? empresa.trim().length >= 2
      : paso === 1
        ? contactos.every((c) => c.nombre.trim().length >= 2 && c.usuario.length >= 3)
        : !conInspeccion || inspeccion.nombre.trim().length >= 2;

  function ir(nuevo: number) {
    setDireccion(nuevo > paso ? 1 : -1);
    setError(null);
    setPaso(nuevo);
  }

  function cambiarContacto(i: number, cambios: Partial<Contacto>) {
    setContactos((lista) =>
      lista.map((c, idx) => {
        if (idx !== i) return c;
        const nuevo = { ...c, ...cambios };
        if (cambios.nombre !== undefined && !c.usuarioEditado) nuevo.usuario = sugerirUsuario(cambios.nombre, empresa);
        return nuevo;
      })
    );
  }

  async function crear() {
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/empresas/alta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresa: empresa.trim(),
        contactos: contactos.map((c) => ({ nombre: c.nombre.trim(), usuario: c.usuario })),
        inspeccion: conInspeccion
          ? {
              nombre: inspeccion.nombre.trim(),
              numeroParte: inspeccion.numeroParte.trim() || null,
              planta: inspeccion.planta || null,
              precioPorPieza: inspeccion.precioPorPieza ? Number(inspeccion.precioPorPieza) : 0,
              meta: inspeccion.meta ? Number(inspeccion.meta) : 0,
            }
          : null,
      }),
    });
    setEnviando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error ?? "No se pudo dar de alta al cliente");
      return;
    }
    vibrar("exito");
    setResultado(d);
    onCreado();
  }

  const mensajeDe = (c: Credencial) =>
    `Hola ${c.nombre.split(" ")[0]}, ya tienes acceso a ${NOMBRE_APP} para ver en vivo las inspecciones de ${
      resultado?.empresa
    }.\n\nEntra a: ${window.location.origin}/login\nUsuario: ${c.usuario}\nContraseña: ${c.password}`;

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.exito("Copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  if (resultado) {
    return (
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-6 text-white">
          <h2 className="mt-2 font-display text-2xl font-extrabold">{resultado.empresa} ya está dentro</h2>
          <p className="text-sm text-white/85">Comparte estos accesos. Las contraseñas solo se muestran esta vez.</p>
        </div>
        <div className="space-y-3 p-5">
          {resultado.credenciales.map((c, i) => (
            <motion.div
              key={c.usuario}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="rounded-xl border border-navy-100 p-4"
            >
              <p className="font-semibold text-navy-900">{c.nombre}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-sm">
                <div className="rounded-lg bg-navy-50 px-3 py-2">
                  <p className="font-sans text-[10px] uppercase tracking-wide text-navy-400">Usuario</p>
                  <p className="text-navy-900">{c.usuario}</p>
                </div>
                <div className="rounded-lg bg-navy-50 px-3 py-2">
                  <p className="font-sans text-[10px] uppercase tracking-wide text-navy-400">Contraseña</p>
                  <p className="text-navy-900">{c.password}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-primary px-3 py-1 text-xs" onClick={() => copiar(mensajeDe(c))}>
                  Copiar mensaje
                </button>
                <a
                  className="inline-flex items-center rounded-lg bg-[#25D366] px-3 py-1 text-xs font-semibold text-white"
                  href={`https://wa.me/?text=${encodeURIComponent(mensajeDe(c))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </div>
            </motion.div>
          ))}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {resultado.inspeccionId && (
              <Link href={`/inspecciones/${resultado.inspeccionId}`} className="btn-secondary" onClick={onCerrar}>
                Ver inspección
              </Link>
            )}
            <button className="btn-accent" onClick={onCerrar}>
              Listo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="border-b border-navy-100 px-5 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-navy-900">Alta de cliente</h2>
          <button onClick={onCerrar} className="rounded-md p-1 text-navy-400 hover:bg-navy-50" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {PASOS.map((p, i) => (
            <div key={p} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  i < paso ? "bg-emerald-500 text-white" : i === paso ? "bg-navy text-white" : "bg-navy-100 text-navy-400"
                }`}
              >
                {i < paso ? "✓" : i + 1}
              </span>
              <span className={`hidden text-xs font-semibold sm:inline ${i === paso ? "text-navy-900" : "text-navy-400"}`}>{p}</span>
              {i < PASOS.length - 1 && (
                <div className="h-0.5 flex-1 overflow-hidden rounded bg-navy-100">
                  <motion.div className="h-full bg-emerald-500" animate={{ width: i < paso ? "100%" : "0%" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="relative min-h-[260px] overflow-hidden p-5">
        <AnimatePresence mode="wait" custom={direccion}>
          <motion.div
            key={paso}
            custom={direccion}
            initial={{ opacity: 0, x: direccion * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direccion * -40 }}
            transition={{ duration: 0.22 }}
            className="space-y-3"
          >
            {paso === 0 && (
              <>
                <label className="label">Nombre de la empresa cliente</label>
                <input
                  className="input text-base"
                  autoFocus
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Ej. Autopartes del Bajío"
                />
                <p className="text-xs text-navy-400">
                  Así aparecerá en inspecciones, facturación y en el portal de sus contactos.
                </p>
              </>
            )}

            {paso === 1 && (
              <>
                <p className="text-sm text-navy-500">
                  Personas de {empresa} que verán sus inspecciones en vivo. La contraseña se genera sola.
                </p>
                {contactos.map((c, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                    <div>
                      {i === 0 && <label className="label">Nombre</label>}
                      <input
                        className="input"
                        autoFocus={i === contactos.length - 1}
                        value={c.nombre}
                        onChange={(e) => cambiarContacto(i, { nombre: e.target.value })}
                        placeholder="Ana Martínez"
                      />
                    </div>
                    <div>
                      {i === 0 && <label className="label">Usuario</label>}
                      <input
                        className="input font-mono"
                        value={c.usuario}
                        onChange={(e) => cambiarContacto(i, { usuario: e.target.value.toLowerCase().replace(/\s/g, ""), usuarioEditado: true })}
                      />
                    </div>
                    <button
                      className="mb-1 rounded-md p-2 text-navy-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      disabled={contactos.length === 1}
                      onClick={() => setContactos((l) => l.filter((_, idx) => idx !== i))}
                      aria-label="Quitar contacto"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {contactos.length < 10 && (
                  <button
                    className="text-sm font-semibold text-navy hover:underline"
                    onClick={() => setContactos((l) => [...l, { nombre: "", usuario: "", usuarioEditado: false }])}
                  >
                    + Agregar otro contacto
                  </button>
                )}
              </>
            )}

            {paso === 2 && (
              <>
                <label className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                  <input type="checkbox" checked={conInspeccion} onChange={(e) => setConInspeccion(e.target.checked)} />
                  Crear ya su primera inspección
                </label>
                <AnimatePresence>
                  {conInspeccion && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid gap-3 overflow-hidden sm:grid-cols-2"
                    >
                      <div className="sm:col-span-2">
                        <label className="label">Nombre de la inspección</label>
                        <input
                          className="input"
                          value={inspeccion.nombre}
                          onChange={(e) => setInspeccion({ ...inspeccion, nombre: e.target.value })}
                          placeholder="Ej. Sorteo lote 001 – Soporte"
                        />
                      </div>
                      <div>
                        <label className="label">Número de parte</label>
                        <input
                          className="input"
                          value={inspeccion.numeroParte}
                          onChange={(e) => setInspeccion({ ...inspeccion, numeroParte: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">Planta</label>
                        <select
                          className="input"
                          value={inspeccion.planta}
                          onChange={(e) => setInspeccion({ ...inspeccion, planta: e.target.value })}
                        >
                          <option value="">Selecciona</option>
                          {PLANTAS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Precio por pieza</label>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          step="0.01"
                          value={inspeccion.precioPorPieza}
                          onChange={(e) => setInspeccion({ ...inspeccion, precioPorPieza: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">Meta de piezas</label>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          value={inspeccion.meta}
                          onChange={(e) => setInspeccion({ ...inspeccion, meta: e.target.value })}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="rounded-xl bg-navy-50 p-3 text-sm text-navy-700">
                  Se creará <strong>{empresa}</strong> con {contactos.length} acceso{contactos.length === 1 ? "" : "s"}
                  {conInspeccion && inspeccion.nombre ? <> y la inspección <strong>{inspeccion.nombre}</strong></> : null}.
                  Los inspectores se asignan después desde la inspección.
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>

      <div className="flex items-center justify-between border-t border-navy-100 px-5 py-4">
        <button className="btn-secondary" onClick={() => (paso === 0 ? onCerrar() : ir(paso - 1))}>
          {paso === 0 ? "Cancelar" : "Atrás"}
        </button>
        {paso < PASOS.length - 1 ? (
          <button className="btn-primary" disabled={!puedeAvanzar} onClick={() => ir(paso + 1)}>
            Siguiente →
          </button>
        ) : (
          <button className="btn-accent" disabled={!puedeAvanzar || enviando} onClick={crear}>
            {enviando ? "Creando…" : "Dar de alta"}
          </button>
        )}
      </div>
    </div>
  );
}
