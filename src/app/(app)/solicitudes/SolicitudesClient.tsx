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
import { useIdioma } from "@/components/ui/Idioma";

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
  { valor: "pendiente", etiqueta: "Pendientes", en: "Pending" },
  { valor: "aceptada", etiqueta: "Aceptadas", en: "Accepted" },
  { valor: "rechazada", etiqueta: "Rechazadas", en: "Declined" },
  { valor: "todas", etiqueta: "Todas", en: "All" },
] as const;

const fecha = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function SolicitudesClient({ rol }: { rol: Rol }) {
  const esCliente = rol === "CLIENTE";
  const puedeResolver = rol === "ADMIN" || rol === "SUPERVISOR";
  const { t } = useIdioma();
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
          <h1 className="font-display text-2xl font-bold text-navy-900">📥 {t("Solicitudes de servicio", "Service requests")}</h1>
          <p className="text-sm text-navy-500">
            {esCliente
              ? t("Pide un sorteo, retrabajo o inspección y sigue su avance aquí.", "Request a sort, rework or inspection and track it here.")
              : t(
                  "Lo que piden los clientes. Al aceptar se crea la inspección lista para asignar inspectores.",
                  "What customers ask for. Accepting creates the inspection, ready to assign inspectors."
                )}
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.96 }} className="btn-accent" onClick={() => setNueva(true)}>
          + {t("Nueva solicitud", "New request")}
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
              {t(f.etiqueta, f.en)}
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
            {filtro === "pendiente"
              ? t("No hay solicitudes pendientes.", "No pending requests.")
              : t("Todavía no hay solicitudes aquí.", "No requests here yet.")}
          </p>
          {esCliente && (
            <button className="btn-primary" onClick={() => setNueva(true)}>
              {t("Hacer mi primera solicitud", "Make my first request")}
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
  const { t, locale } = useIdioma();
  const [aceptando, setAceptando] = useState(false);
  const tipo = TIPO_SOLICITUD_INFO[s.tipo] ?? TIPO_SOLICITUD_INFO.otro;
  const urgencia = URGENCIAS.find((u) => u.valor === s.urgencia) ?? URGENCIAS[0];
  const pasos = [
    { texto: t("Enviada", "Sent"), hecho: true },
    {
      texto: s.estado === "rechazada" ? t("No aceptada", "Declined") : t("Aceptada", "Accepted"),
      hecho: s.estado !== "pendiente",
      error: s.estado === "rechazada",
    },
    ...(s.estado === "rechazada"
      ? []
      : [{ texto: s.inspeccion?.cerrado ? t("Cerrada", "Closed") : t("En proceso", "In progress"), hecho: Boolean(s.inspeccion) }]),
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
      toast.error(d.error ?? t("No se pudo aceptar", "Could not accept"));
      return;
    }
    toast.exito(t(`Solicitud #${s.folio} aceptada. Asigna inspectores y precio.`, `Request #${s.folio} accepted. Assign inspectors and pricing.`));
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
            #{s.folio} · {fecha(s.creadoEn, locale)}
            {!esCliente && ` · ${s.cliente}`}
          </p>
          <h3 className="mt-0.5 font-display text-lg font-bold text-navy-900">
            {tipo.icono} {t(tipo.etiqueta, tipo.en)} · {s.numeroParte}
          </h3>
          <p className="text-xs text-navy-500">
            {s.cantidad ? `${s.cantidad.toLocaleString(locale)} ${t("pzas", "pcs")}` : t("Cantidad por definir", "Quantity TBD")}
            {s.planta ? ` · 🏭 ${s.planta}` : ""} · {t("pidió", "requested by")} {s.solicitante.nombre}
          </p>
        </div>
        <span className={`badge shrink-0 ${urgencia.clase}`}>{t(urgencia.etiqueta, urgencia.en)}</span>
      </div>

      <div className="flex gap-3">
        <p className="flex-1 whitespace-pre-wrap text-sm text-navy-700">{s.descripcion}</p>
        {s.fotoUrl && (
          <a href={s.fotoUrl} target="_blank" rel="noreferrer" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.fotoUrl} alt={t("Foto de la solicitud", "Request photo")} className="h-20 w-20 rounded-lg object-cover" />
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
          <strong>{s.atendidaPor?.nombre ?? t("Respuesta", "Response")}:</strong> {s.respuesta}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {s.inspeccion && (
          <Link href={`/inspecciones/${s.inspeccion.id}`} className="btn-primary px-3 py-1.5 text-sm">
            {esCliente ? `📊 ${t("Ver avance en vivo", "View live progress")}` : t("Abrir inspección", "Open inspection")}
          </Link>
        )}
        {s.inspeccion && (
          <span className="text-xs text-navy-500">
            {(s.inspeccion.piezasBuenas + s.inspeccion.piezasMalas).toLocaleString(locale)} {t("pzas inspeccionadas", "pcs inspected")}
          </span>
        )}
        {s.estado === "pendiente" && puedeResolver && (
          <>
            <button className="btn-accent px-3 py-1.5 text-sm" onClick={aceptar} disabled={aceptando}>
              {aceptando ? t("Creando inspección…", "Creating inspection…") : `✅ ${t("Aceptar", "Accept")}`}
            </button>
            <button className="btn-secondary px-3 py-1.5 text-sm" onClick={onRechazar}>
              {t("Rechazar", "Decline")}
            </button>
          </>
        )}
        {s.estado === "pendiente" && !puedeResolver && (
          <span className="text-xs font-semibold text-amber-700">
            ⏳ {t("Esperando respuesta de supervisión", "Waiting for a supervisor’s response")}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function NuevaSolicitud({ esCliente, onCerrar, onCreada }: { esCliente: boolean; onCerrar: () => void; onCreada: () => void }) {
  const toast = useToast();
  const { t } = useIdioma();
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
        if (!r.ok) throw new Error(d.error ?? t("No se pudo subir la foto", "Could not upload the photo"));
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
      if (!res.ok) throw new Error(d.error ?? t("No se pudo enviar la solicitud", "Could not send the request"));
      toast.exito(t(`Solicitud #${d.folio} enviada. Te avisamos cuando la revisen.`, `Request #${d.folio} sent. We’ll let you know when it’s reviewed.`));
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Sin conexión, intenta de nuevo", "No connection, try again"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-navy-900">{t("Nueva solicitud", "New request")}</h2>
        <button type="button" onClick={onCerrar} className="rounded-md p-1 text-navy-400 hover:bg-navy-50" aria-label={t("Cerrar", "Close")}>
          ✕
        </button>
      </div>

      {!esCliente && (
        <div>
          <label className="label">{t("Cliente", "Customer")}</label>
          <ClienteSelect value={cliente} onChange={setCliente} required />
        </div>
      )}

      <div>
        <label className="label">{t("¿Qué necesitas?", "What do you need?")}</label>
        <div className="grid grid-cols-2 gap-2">
          {TIPOS_SOLICITUD.map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => setTipo(tp)}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                tipo === tp ? "border-navy bg-navy text-white" : "border-navy-200 text-navy-700 hover:bg-navy-50"
              }`}
            >
              {TIPO_SOLICITUD_INFO[tp].icono} {t(TIPO_SOLICITUD_INFO[tp].etiqueta, TIPO_SOLICITUD_INFO[tp].en)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="label">{t("Número de parte", "Part number")}</label>
          <input className="input" required value={numeroParte} onChange={(e) => setNumeroParte(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("Cantidad aprox.", "Approx. quantity")}</label>
          <input className="input" type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("Planta", "Plant")}</label>
          <select className="input" value={planta} onChange={(e) => setPlanta(e.target.value)}>
            <option value="">{t("Por definir", "TBD")}</option>
            {PLANTAS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">{t("Urgencia", "Urgency")}</label>
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
              {t(u.etiqueta, u.en)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">{t("Describe el problema o criterio", "Describe the problem or criteria")}</label>
        <textarea
          className="input"
          rows={4}
          required
          minLength={5}
          placeholder={t(
            "Ej. Rebaba en el barreno central, sortear todo el lote 4521 que está en su almacén…",
            "E.g. Burr on the center hole, sort all of lot 4521 in your warehouse…"
          )}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      <div>
        <label className="label">{t("Foto del problema (opcional)", "Photo of the problem (optional)")}</label>
        <input className="input text-xs" type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar}>
          {t("Cancelar", "Cancel")}
        </button>
        <button type="submit" className="btn-accent" disabled={enviando || (!esCliente && !cliente)}>
          {enviando ? t("Enviando…", "Sending…") : `📨 ${t("Enviar solicitud", "Send request")}`}
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
