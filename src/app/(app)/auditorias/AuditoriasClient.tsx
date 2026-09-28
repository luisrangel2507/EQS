"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Rol } from "@prisma/client";
import { motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import { PLANTAS } from "@/lib/constants";
import { useIdioma } from "@/components/ui/Idioma";
import { TIPOS_AUDITORIA, type ItemChecklist } from "@/lib/auditorias";
import { consumirParametro } from "@/lib/eventos";
import ClienteSelect from "@/components/ClienteSelect";
import Modal from "@/components/ui/Modal";
import { SkeletonTarjetas } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

type Auditoria = {
  id: string;
  folio: number;
  nombrePlantilla: string;
  tipo: string;
  planta: string | null;
  cliente: string | null;
  area: string | null;
  puntaje: number | null;
  hallazgos: number;
  estado: string;
  creadoEn: string;
  auditor: { nombre: string };
};

type Plantilla = {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string | null;
  items: ItemChecklist[];
  activa: boolean;
  _count: { auditorias: number };
};

const LIDERAZGO: Rol[] = ["ADMIN", "SUPERVISOR", "GERENTE", "LIDER"];

export function colorPuntaje(p: number | null) {
  if (p === null) return "#8A94B8";
  return p >= 90 ? "#059669" : p >= 75 ? "#D97706" : "#DC2626";
}

export function AnilloPuntaje({ puntaje, tamano = 52 }: { puntaje: number | null; tamano?: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" className="stroke-navy-100" strokeWidth="5" />
        {puntaje !== null && (
          <motion.circle
            cx="24"
            cy="24"
            r={r}
            fill="none"
            stroke={colorPuntaje(puntaje)}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - puntaje / 100) }}
            transition={{ duration: 0.9 }}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-navy-900">
        {puntaje !== null ? `${puntaje.toFixed(0)}%` : "…"}
      </span>
    </div>
  );
}

export default function AuditoriasClient({ rol }: { rol: Rol }) {
  const puedeAuditar = LIDERAZGO.includes(rol) || rol === "RESIDENTE";
  const puedePlantillas = rol === "ADMIN" || rol === "SUPERVISOR";
  const { t, locale } = useIdioma();
  const [pestana, setPestana] = useState<"auditorias" | "plantillas">("auditorias");
  const { datos: auditorias, cargando, recargar } = usePolling<Auditoria[]>("/api/auditorias", 30000);
  const { datos: plantillas, recargar: recargarPlantillas } = usePolling<Plantilla[]>(
    puedeAuditar ? "/api/auditorias/plantillas" : null,
    60000
  );
  const [nueva, setNueva] = useState(false);
  const [editando, setEditando] = useState<Plantilla | "nueva" | null>(null);

  useEffect(() => {
    if (consumirParametro("nueva") === "1" && puedeAuditar) setNueva(true);
  }, [puedeAuditar]);

  const completadas = (auditorias ?? []).filter((a) => a.estado === "completada");
  const promedio = completadas.length ? completadas.reduce((s, a) => s + (a.puntaje ?? 0), 0) / completadas.length : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">📋 {t("Auditorías", "Audits")}</h1>
          <p className="text-sm text-navy-500">
            {rol === "CLIENTE"
              ? t("Auditorías realizadas a tus procesos de sorteo.", "Audits performed on your sorting processes.")
              : t("Auditorías de capas, 5S y recibo con evidencia fotográfica.", "Layered, 5S and receiving audits with photo evidence.")}
            {promedio !== null && ` ${t("Cumplimiento promedio", "Average compliance")}: ${promedio.toFixed(0)}%.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedePlantillas && (
            <div className="inline-flex rounded-full border border-navy-200 bg-white p-1">
              {(["auditorias", "plantillas"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPestana(p)}
                  className={`relative rounded-full px-3.5 py-1.5 text-sm font-semibold ${pestana === p ? "text-white" : "text-navy-500"}`}
                >
                  {pestana === p && <motion.span layoutId="pestana-aud" className="absolute inset-0 rounded-full bg-navy" />}
                  <span className="relative">{p === "auditorias" ? t("Auditorías", "Audits") : t("Plantillas", "Templates")}</span>
                </button>
              ))}
            </div>
          )}
          {puedeAuditar && pestana === "auditorias" && (
            <button className="btn-accent" onClick={() => setNueva(true)}>
              + {t("Nueva auditoría", "New audit")}
            </button>
          )}
          {puedePlantillas && pestana === "plantillas" && (
            <button className="btn-accent" onClick={() => setEditando("nueva")}>
              + {t("Plantilla", "Template")}
            </button>
          )}
        </div>
      </div>

      {pestana === "auditorias" ? (
        cargando && !auditorias ? (
          <SkeletonTarjetas cantidad={3} alto="h-10" />
        ) : !auditorias?.length ? (
          <div className="card flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-5xl">📋</span>
            <p className="text-sm text-navy-500">{t("Todavía no hay auditorías.", "No audits yet.")}</p>
            {puedeAuditar && (
              <button className="btn-primary" onClick={() => setNueva(true)}>
                {t("Hacer la primera", "Do the first one")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {auditorias.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 9) * 0.04 }}>
                <Link
                  href={`/auditorias/${a.id}`}
                  className="card flex h-full items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <AnilloPuntaje puntaje={a.estado === "completada" ? a.puntaje : null} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy-900">
                      {TIPOS_AUDITORIA[a.tipo]?.icono} {a.nombrePlantilla}
                    </p>
                    <p className="truncate text-xs text-navy-500">
                      A-{String(a.folio).padStart(4, "0")} · {new Date(a.creadoEn).toLocaleDateString(locale, { day: "2-digit", month: "short" })} ·{" "}
                      {a.auditor.nombre}
                    </p>
                    <p className="truncate text-xs text-navy-400">
                      {[a.planta, a.cliente, a.area].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  {a.estado === "borrador" ? (
                    <span className="badge bg-amber-100 text-amber-800">{t("En curso", "In progress")}</span>
                  ) : a.hallazgos > 0 ? (
                    <span className="badge bg-red-100 text-red-800">
                      {a.hallazgos} {t("hallazgo", "finding")}
                      {a.hallazgos === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="badge bg-green-100 text-green-800">{t("Sin hallazgos", "No findings")}</span>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {!plantillas?.length && (
            <div className="card flex flex-col items-center gap-3 py-10 text-center md:col-span-2 xl:col-span-3">
              <p className="text-sm text-navy-500">Sin plantillas. Empieza con las de ejemplo y ajústalas.</p>
              <EjemplosBoton onHecho={recargarPlantillas} />
            </div>
          )}
          {plantillas?.map((p) => (
            <div key={p.id} className={`card flex flex-col gap-2 ${p.activa ? "" : "opacity-60"}`}>
              <p className="font-semibold text-navy-900">
                {TIPOS_AUDITORIA[p.tipo]?.icono} {p.nombre}
              </p>
              <p className="line-clamp-2 text-sm text-navy-500">{p.descripcion}</p>
              <p className="text-xs text-navy-400">
                {p.items.length} puntos · {p._count.auditorias} auditoría(s){p.activa ? "" : " · desactivada"}
              </p>
              <button className="btn-secondary mt-auto self-start px-3 py-1.5 text-sm" onClick={() => setEditando(p)}>
                Editar
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal abierto={nueva} onCerrar={() => setNueva(false)} ancho="max-w-md">
        {nueva && (
          <NuevaAuditoria
            rol={rol}
            plantillas={(plantillas ?? []).filter((p) => p.activa)}
            puedePlantillas={puedePlantillas}
            onEjemplos={recargarPlantillas}
            onCerrar={() => setNueva(false)}
            onCreada={recargar}
          />
        )}
      </Modal>
      <Modal abierto={Boolean(editando)} onCerrar={() => setEditando(null)}>
        {editando && (
          <EditorPlantilla
            plantilla={editando === "nueva" ? null : editando}
            onCerrar={() => setEditando(null)}
            onGuardado={() => {
              setEditando(null);
              recargarPlantillas();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function EjemplosBoton({ onHecho }: { onHecho: () => void }) {
  const toast = useToast();
  const [cargando, setCargando] = useState(false);
  return (
    <button
      className="btn-primary"
      disabled={cargando}
      onClick={async () => {
        setCargando(true);
        const res = await fetch("/api/auditorias/plantillas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ejemplos: true }),
        });
        setCargando(false);
        if (res.ok) {
          toast.exito("Plantillas de ejemplo creadas: capas, 5S y recibo");
          onHecho();
        } else toast.error("No se pudieron crear");
      }}
    >
      {cargando ? "Creando…" : "✨ Usar plantillas de ejemplo"}
    </button>
  );
}

function NuevaAuditoria({
  rol,
  plantillas,
  puedePlantillas,
  onEjemplos,
  onCerrar,
  onCreada,
}: {
  rol: Rol;
  plantillas: Plantilla[];
  puedePlantillas: boolean;
  onEjemplos: () => void;
  onCerrar: () => void;
  onCreada: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [plantillaId, setPlantillaId] = useState("");
  const [planta, setPlanta] = useState("");
  const [cliente, setCliente] = useState("");
  const [area, setArea] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const res = await fetch("/api/auditorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plantillaId, planta: planta || null, cliente: cliente || null, area: area || null }),
    });
    setEnviando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo iniciar la auditoría");
      return;
    }
    onCreada();
    router.push(`/auditorias/${d.id}`);
  }

  return (
    <form onSubmit={crear} className="space-y-3 rounded-2xl bg-white p-5 shadow-2xl">
      <h2 className="font-display text-lg font-bold text-navy-900">Nueva auditoría</h2>
      {plantillas.length === 0 ? (
        <div className="space-y-2 text-sm text-navy-500">
          <p>No hay plantillas activas.</p>
          {puedePlantillas && <EjemplosBoton onHecho={onEjemplos} />}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {plantillas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlantillaId(p.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  plantillaId === p.id ? "border-navy bg-navy text-white" : "border-navy-200 hover:bg-navy-50"
                }`}
              >
                <span className="text-xl">{TIPOS_AUDITORIA[p.tipo]?.icono}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{p.nombre}</span>
                  <span className={`text-xs ${plantillaId === p.id ? "text-white/70" : "text-navy-400"}`}>{p.items.length} puntos</span>
                </span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {rol !== "RESIDENTE" && (
              <div>
                <label className="label">Planta</label>
                <select className="input" value={planta} onChange={(e) => setPlanta(e.target.value)}>
                  <option value="">—</option>
                  {PLANTAS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Área / estación</label>
              <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ej. Estación 3" />
            </div>
          </div>
          <div>
            <label className="label">Cliente (opcional, lo podrá ver)</label>
            <ClienteSelect value={cliente} onChange={setCliente} />
          </div>
        </>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="submit" className="btn-accent" disabled={!plantillaId || enviando}>
          {enviando ? "Iniciando…" : "▶ Empezar"}
        </button>
      </div>
    </form>
  );
}

function EditorPlantilla({ plantilla, onCerrar, onGuardado }: { plantilla: Plantilla | null; onCerrar: () => void; onGuardado: () => void }) {
  const toast = useToast();
  const [nombre, setNombre] = useState(plantilla?.nombre ?? "");
  const [tipo, setTipo] = useState(plantilla?.tipo ?? "capas");
  const [descripcion, setDescripcion] = useState(plantilla?.descripcion ?? "");
  const [items, setItems] = useState<ItemChecklist[]>(plantilla?.items ?? [{ texto: "", requiereFoto: false }]);
  const [activa, setActiva] = useState(plantilla?.activa ?? true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await fetch(plantilla ? `/api/auditorias/plantillas/${plantilla.id}` : "/api/auditorias/plantillas", {
      method: plantilla ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, tipo, descripcion: descripcion || null, items, ...(plantilla ? { activa } : {}) }),
    });
    setEnviando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error ?? "No se pudo guardar");
      return;
    }
    toast.exito("Plantilla guardada");
    onGuardado();
  }

  const mover = (i: number, d: number) =>
    setItems((l) => {
      const n = [...l];
      const j = i + d;
      if (j < 0 || j >= n.length) return l;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <form onSubmit={guardar} className="max-h-[85vh] space-y-3 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
      <h2 className="font-display text-lg font-bold text-navy-900">{plantilla ? "Editar plantilla" : "Nueva plantilla"}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label">Nombre</label>
          <input className="input" required minLength={3} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(TIPOS_AUDITORIA).map(([v, t]) => (
              <option key={v} value={v}>
                {t.icono} {t.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Descripción</label>
        <input className="input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <div className="space-y-2">
        <p className="label">Puntos a revisar</p>
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 text-right text-xs text-navy-400">{i + 1}</span>
            <input
              className="input flex-1"
              value={it.texto}
              placeholder="Ej. Material NG separado e identificado"
              onChange={(e) => setItems((l) => l.map((x, k) => (k === i ? { ...x, texto: e.target.value } : x)))}
            />
            <label className="flex shrink-0 items-center gap-1 text-xs text-navy-600" title="Exigir foto si no cumple">
              <input
                type="checkbox"
                checked={it.requiereFoto}
                onChange={(e) => setItems((l) => l.map((x, k) => (k === i ? { ...x, requiereFoto: e.target.checked } : x)))}
              />
              📷
            </label>
            <button type="button" className="text-navy-300 hover:text-navy-700" onClick={() => mover(i, -1)} aria-label="Subir">
              ↑
            </button>
            <button type="button" className="text-navy-300 hover:text-navy-700" onClick={() => mover(i, 1)} aria-label="Bajar">
              ↓
            </button>
            {items.length > 1 && (
              <button type="button" className="text-navy-300 hover:text-red-600" onClick={() => setItems((l) => l.filter((_, k) => k !== i))}>
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" className="text-sm font-semibold text-navy hover:underline" onClick={() => setItems((l) => [...l, { texto: "", requiereFoto: false }])}>
          + Agregar punto
        </button>
        <p className="text-xs text-navy-400">📷 = exige foto de evidencia cuando el punto no cumple.</p>
      </div>
      {plantilla && (
        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} /> Plantilla activa
        </label>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
