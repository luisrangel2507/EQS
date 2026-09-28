"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Rol } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import { PLANTAS, TIPOS_SOLICITUD, TIPO_SOLICITUD_INFO, URGENCIAS } from "@/lib/constants";
import { comprimirImagen } from "@/lib/imagen";
import { consumirParametro } from "@/lib/eventos";
import ClienteSelect from "@/components/ClienteSelect";
import Modal from "@/components/ui/Modal";
import { SkeletonTarjetas } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

type Solicitud = {
  id: string;
  folio: number;
  cliente: string;
  tipo: string;
  numeroParte: string;
  descripcion: string;
  cantidad: number | null;
  planta: string | null;
  urgencia: string;
  fotoUrl: string | null;
  estado: "pendiente" | "aceptada" | "rechazada";
  respuesta: string | null;
  atendidaEn: string | null;
  creadoEn: string;
  solicitante: { nombre: string };
  atendidaPor: { nombre: string } | null;
  inspeccion: { id: string; cerrado: boolean; piezasBuenas: number; piezasMalas: number } | null;
};

const FILTROS = [
  { valor: "pendiente", etiqueta: "Pendientes" },
  { valor: "aceptada", etiqueta: "Aceptadas" },
  { valor: "rechazada", etiqueta: "Rechazadas" },
  { valor: "todas", etiqueta: "Todas" },
] as const;

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function SolicitudesClient({ rol }: { rol: Rol }) {
  const esCliente = rol === "CLIENTE";
  const puedeResolver = rol === "ADMIN" || rol === "SUPERVISOR";
  const { datos, cargando, recargar } = usePolling<Solicitud[]>("/api/solicitudes", 20000);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["valor"]>(esCliente ? "todas" : "pendiente");
  const [nueva, setNueva] = useState(false);
  const [rechazando, setRechazando] = useState<Solicitud | null>(null);

  useEffect(() => {
    if (consumirParametro("nueva") === "1") setNueva(true);
  }, []);

  const lista = (datos ?? []).filter((s) => filtro === "todas" || s.estado === filtro);
  const pendientes = (datos ?? []).filter((s) => s.estado === "pendiente").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">📥 Solicitudes de servicio</h1>
          <p className="text-sm text-navy-500">
            {esCliente
              ? "Pide un sorteo, retrabajo o inspección y sigue su avance aquí."
              : "Lo que piden los clientes. Al aceptar se crea la inspección lista para asignar inspectores."}
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.96 }} className="btn-accent" onClick={() => setNueva(true)}>
          + Nueva solicitud
        </motion.button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`relative rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              filtro === f.valor ? "border-navy text-white" : "border-navy-200 bg-white text-navy-500"
            }`}
          >
            {filtro === f.valor && (
              <motion.span layoutId="filtro-solicitudes" className="absolute inset-0 rounded-full bg-navy" />
            )}
            <span className="relative">
              {f.etiqueta}
              {f.valor === "pendiente" && pendientes > 0 ? ` (${pendientes})` : ""}
            </span>
          </button>
        ))}
      </div>

      {cargando && !datos ? (
        <SkeletonTarjetas cantidad={3} alto="h-16" />
      ) : lista.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-5xl">{filtro === "pendiente" ? "🎉" : "📭"}</span>
          <p className="text-sm text-navy-500">
            {filtro === "pendiente" ? "No hay solicitudes pendientes." : "Todavía no hay solicitudes aquí."}
          </p>
          {esCliente && (
            <button className="btn-primary" onClick={() => setNueva(true)}>
              Hacer mi primera solicitud
            </button>
          )}
        </div>
      ) : (
        <motion.div layout className="grid gap-4 lg:grid-cols-2">
          <AnimatePresence>
            {lista.map((s, i) => (
              <Tarjeta
                key={s.id}
                s={s}
                indice={i}
                esCliente={esCliente}
                puedeResolver={puedeResolver}
                onRechazar={() => setRechazando(s)}
                onCambio={recargar}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <Modal abierto={nueva} onCerrar={() => setNueva(false)}>
        {nueva && (
          <NuevaSolicitud
            esCliente={esCliente}
            onCerrar={() => setNueva(false)}
            onCreada={() => {
              setNueva(false);
              recargar();
            }}
          />
        )}
      </Modal>

      <Modal abierto={Boolean(rechazando)} onCerrar={() => setRechazando(null)} ancho="max-w-md">
        {rechazando && (
          <Rechazo
            s={rechazando}
            onCerrar={() => setRechazando(null)}
            onHecho={() => {
              setRechazando(null);
              recargar();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function Tarjeta({
  s,
  indice,
  esCliente,
  puedeResolver,
  onRechazar,
  onCambio,
}: {
  s: Solicitud;
  indice: number;
  esCliente: boolean;
  puedeResolver: boolean;
  onRechazar: () => void;
  onCambio: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [aceptando, setAceptando] = useState(false);
  const tipo = TIPO_SOLICITUD_INFO[s.tipo] ?? TIPO_SOLICITUD_INFO.otro;
  const urgencia = URGENCIAS.find((u) => u.valor === s.urgencia) ?? URGENCIAS[0];
  const pasos = [
    { texto: "Enviada", hecho: true },
    { texto: s.estado === "rechazada" ? "No aceptada" : "Aceptada", hecho: s.estado !== "pendiente", error: s.estado === "rechazada" },
    ...(s.estado === "rechazada" ? [] : [{ texto: s.inspeccion?.cerrado ? "Cerrada" : "En proceso", hecho: Boolean(s.inspeccion) }]),
  ];

  async function aceptar() {
    setAceptando(true);
    const res = await fetch(`/api/solicitudes/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aceptar" }),
    });
    setAceptando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo aceptar");
      return;
    }
    toast.exito(`Solicitud #${s.folio} aceptada. Asigna inspectores y precio.`);
    onCambio();
    if (d.inspeccionId) router.push(`/inspecciones/${d.inspeccionId}`);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(indice, 8) * 0.04 }}
      className={`card flex flex-col gap-3 ${s.estado === "pendiente" && s.urgencia === "critica" ? "animate-respirar border-red-300" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-navy-400">
            #{s.folio} · {fecha(s.creadoEn)}
            {!esCliente && ` · ${s.cliente}`}
          </p>
          <h3 className="mt-0.5 font-display text-lg font-bold text-navy-900">
            {tipo.icono} {tipo.etiqueta} · {s.numeroParte}
          </h3>
          <p className="text-xs text-navy-500">
            {s.cantidad ? `${s.cantidad.toLocaleString("es-MX")} pzas` : "Cantidad por definir"}
            {s.planta ? ` · 🏭 ${s.planta}` : ""} · pidió {s.solicitante.nombre}
          </p>
        </div>
        <span className={`badge shrink-0 ${urgencia.clase}`}>{urgencia.etiqueta}</span>
      </div>

      <div className="flex gap-3">
        <p className="flex-1 whitespace-pre-wrap text-sm text-navy-700">{s.descripcion}</p>
        {s.fotoUrl && (
          <a href={s.fotoUrl} target="_blank" rel="noreferrer" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.fotoUrl} alt="Foto de la solicitud" className="h-20 w-20 rounded-lg object-cover" />
          </a>
        )}
      </div>

      <div className="flex items-center gap-2">
        {pasos.map((p, i) => (
          <div key={p.texto} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                p.error ? "bg-red-500 text-white" : p.hecho ? "bg-emerald-500 text-white" : "bg-navy-100 text-navy-400"
              }`}
            >
              {p.error ? "✕" : p.hecho ? "✓" : i + 1}
            </span>
            <span className={`text-xs font-semibold ${p.hecho ? "text-navy-800" : "text-navy-400"}`}>{p.texto}</span>
            {i < pasos.length - 1 && <span className="h-0.5 flex-1 rounded bg-navy-100" />}
          </div>
        ))}
      </div>

      {s.respuesta && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            s.estado === "rechazada" ? "bg-red-50 text-red-800" : "bg-navy-50 text-navy-700"
          }`}
        >
          <strong>{s.atendidaPor?.nombre ?? "Respuesta"}:</strong> {s.respuesta}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {s.inspeccion && (
          <Link href={`/inspecciones/${s.inspeccion.id}`} className="btn-primary px-3 py-1.5 text-sm">
            {esCliente ? "📊 Ver avance en vivo" : "Abrir inspección"}
          </Link>
        )}
        {s.inspeccion && (
          <span className="text-xs text-navy-500">
            {(s.inspeccion.piezasBuenas + s.inspeccion.piezasMalas).toLocaleString("es-MX")} pzas inspeccionadas
          </span>
        )}
        {s.estado === "pendiente" && puedeResolver && (
          <>
            <button className="btn-accent px-3 py-1.5 text-sm" onClick={aceptar} disabled={aceptando}>
              {aceptando ? "Creando inspección…" : "✅ Aceptar"}
            </button>
            <button className="btn-secondary px-3 py-1.5 text-sm" onClick={onRechazar}>
              Rechazar
            </button>
          </>
        )}
        {s.estado === "pendiente" && !puedeResolver && (
          <span className="text-xs font-semibold text-amber-700">⏳ Esperando respuesta de supervisión</span>
        )}
      </div>
    </motion.div>
  );
}

function NuevaSolicitud({ esCliente, onCerrar, onCreada }: { esCliente: boolean; onCerrar: () => void; onCreada: () => void }) {
  const toast = useToast();
  const [cliente, setCliente] = useState("");
  const [tipo, setTipo] = useState<string>("sorteo");
  const [numeroParte, setNumeroParte] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [planta, setPlanta] = useState("");
  const [urgencia, setUrgencia] = useState("normal");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      let fotoUrl: string | null = null;
      if (foto) {
        const form = new FormData();
        form.append("foto", await comprimirImagen(foto));
        const r = await fetch("/api/upload", { method: "POST", body: form });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "No se pudo subir la foto");
        fotoUrl = d.url;
      }
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: esCliente ? undefined : cliente,
          tipo,
          numeroParte,
          cantidad: cantidad ? Number(cantidad) : null,
          planta: planta || null,
          urgencia,
          descripcion,
          fotoUrl,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "No se pudo enviar la solicitud");
      toast.exito(`Solicitud #${d.folio} enviada. Te avisamos cuando la revisen.`);
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sin conexión, intenta de nuevo");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-navy-900">Nueva solicitud</h2>
        <button type="button" onClick={onCerrar} className="rounded-md p-1 text-navy-400 hover:bg-navy-50" aria-label="Cerrar">
          ✕
        </button>
      </div>

      {!esCliente && (
        <div>
          <label className="label">Cliente</label>
          <ClienteSelect value={cliente} onChange={setCliente} required />
        </div>
      )}

      <div>
        <label className="label">¿Qué necesitas?</label>
        <div className="grid grid-cols-2 gap-2">
          {TIPOS_SOLICITUD.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                tipo === t ? "border-navy bg-navy text-white" : "border-navy-200 text-navy-700 hover:bg-navy-50"
              }`}
            >
              {TIPO_SOLICITUD_INFO[t].icono} {TIPO_SOLICITUD_INFO[t].etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="label">Número de parte</label>
          <input className="input" required value={numeroParte} onChange={(e) => setNumeroParte(e.target.value)} />
        </div>
        <div>
          <label className="label">Cantidad aprox.</label>
          <input className="input" type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </div>
        <div>
          <label className="label">Planta</label>
          <select className="input" value={planta} onChange={(e) => setPlanta(e.target.value)}>
            <option value="">Por definir</option>
            {PLANTAS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Urgencia</label>
        <div className="flex flex-wrap gap-2">
          {URGENCIAS.map((u) => (
            <button
              key={u.valor}
              type="button"
              onClick={() => setUrgencia(u.valor)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                urgencia === u.valor ? `${u.clase} border-transparent ring-2 ring-navy` : "border-navy-200 text-navy-600"
              }`}
            >
              {u.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Describe el problema o criterio</label>
        <textarea
          className="input"
          rows={4}
          required
          minLength={5}
          placeholder="Ej. Rebaba en el barreno central, sortear todo el lote 4521 que está en su almacén…"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Foto del problema (opcional)</label>
        <input className="input text-xs" type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="submit" className="btn-accent" disabled={enviando || (!esCliente && !cliente)}>
          {enviando ? "Enviando…" : "📨 Enviar solicitud"}
        </button>
      </div>
    </form>
  );
}

function Rechazo({ s, onCerrar, onHecho }: { s: Solicitud; onCerrar: () => void; onHecho: () => void }) {
  const toast = useToast();
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function rechazar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const res = await fetch(`/api/solicitudes/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "rechazar", respuesta: motivo }),
    });
    setEnviando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo rechazar");
      return;
    }
    toast.info(`Solicitud #${s.folio} rechazada; ${s.cliente} ya fue avisado.`);
    onHecho();
  }

  return (
    <form onSubmit={rechazar} className="space-y-3 rounded-2xl bg-white p-5 shadow-2xl">
      <h2 className="font-display text-lg font-bold text-navy-900">Rechazar solicitud #{s.folio}</h2>
      <p className="text-sm text-navy-500">El cliente verá este motivo.</p>
      <textarea
        className="input"
        rows={3}
        required
        minLength={3}
        autoFocus
        placeholder="Ej. No tenemos personal certificado para esa pieza esta semana; podemos iniciar el lunes."
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? "Enviando…" : "Rechazar y avisar"}
        </button>
      </div>
    </form>
  );
}
