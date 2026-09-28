"use client";

import { useState } from "react";
import type { Rol } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import { comprimirImagen } from "@/lib/imagen";
import { vibrar } from "@/lib/feedback";
import Modal from "@/components/ui/Modal";
import { SkeletonPagina } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

type Pregunta = { texto: string; opciones: string[]; correcta?: number };
type Criterio = {
  id: string;
  numeroParte: string;
  descripcion: string;
  fotoOkUrl: string | null;
  fotoNgUrl: string | null;
  preguntas: Pregunta[];
  vigenciaDias: number;
};
type Certificacion = {
  id: string;
  usuarioId: string;
  numeroParte: string;
  metodo: string;
  calificacion: number | null;
  vence: string | null;
  otorgadaPor: { nombre: string } | null;
};
type Datos = { criterios: Criterio[]; certificaciones: Certificacion[]; inspectores: { id: string; nombre: string }[] };

const DIAS_AVISO = 30;

function estadoDe(c: Certificacion | undefined) {
  if (!c) return { clave: "ninguna" as const, texto: "Sin certificar", icono: "—", clase: "bg-navy-50 text-navy-400" };
  const dias = c.vence ? (new Date(c.vence).getTime() - Date.now()) / 86400000 : Infinity;
  if (dias <= 0) return { clave: "vencida" as const, texto: "Vencida", icono: "✕", clase: "bg-red-100 text-red-700" };
  if (dias <= DIAS_AVISO) return { clave: "porVencer" as const, texto: `Vence en ${Math.ceil(dias)} d`, icono: "!", clase: "bg-amber-100 text-amber-800" };
  return { clave: "vigente" as const, texto: "Certificado", icono: "✓", clase: "bg-emerald-100 text-emerald-700" };
}

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "sin vencimiento");

export default function CertificacionesClient({ rol }: { rol: Rol }) {
  const { datos, cargando, recargar } = usePolling<Datos>("/api/certificaciones", 60000);
  if (cargando && !datos) return <SkeletonPagina />;
  if (!datos) return null;
  return rol === "INSPECTOR" ? (
    <VistaInspector datos={datos} recargar={recargar} />
  ) : (
    <VistaLiderazgo datos={datos} recargar={recargar} puedeEditar={rol === "ADMIN" || rol === "SUPERVISOR"} />
  );
}

/* ---------------- Inspector ---------------- */

function VistaInspector({ datos, recargar }: { datos: Datos; recargar: () => void }) {
  const [examen, setExamen] = useState<Criterio | null>(null);
  const vigentes = datos.criterios.filter((c) => estadoDe(datos.certificaciones.find((x) => x.numeroParte === c.numeroParte)).clave === "vigente").length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 to-navy-950 p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow">Mis certificaciones</p>
        <p className="mt-1 font-display text-3xl font-extrabold">
          🎓 {vigentes} de {datos.criterios.length}
        </p>
        <p className="text-sm text-white/70">Piezas en las que puedes ser asignado. Estudia el criterio y presenta el examen.</p>
      </div>
      {datos.criterios.length === 0 ? (
        <p className="card text-sm text-navy-400">Todavía no hay piezas que requieran certificación.</p>
      ) : (
        <div className="space-y-3">
          {datos.criterios.map((c, i) => {
            const cert = datos.certificaciones.find((x) => x.numeroParte === c.numeroParte);
            const e = estadoDe(cert);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-navy-900">{c.numeroParte}</p>
                  <p className="text-xs text-navy-500">
                    <span className={`badge mr-1 ${e.clase}`}>{e.texto}</span>
                    {cert && e.clave !== "vencida" ? `hasta ${fecha(cert.vence)}` : `${c.preguntas.length} preguntas`}
                  </p>
                </div>
                <button
                  className={e.clave === "vigente" ? "btn-secondary px-3 py-1.5 text-sm" : "btn-accent px-3 py-1.5 text-sm"}
                  onClick={() => setExamen(c)}
                >
                  {e.clave === "vigente" ? "Repasar" : e.clave === "ninguna" ? "Certificarme" : "Renovar"}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
      <Modal abierto={Boolean(examen)} onCerrar={() => setExamen(null)}>
        {examen && (
          <Examen
            criterio={examen}
            onCerrar={() => {
              setExamen(null);
              recargar();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

type Resultado = { aprobado: boolean; calificacion: number; correctas: number; total: number; minima: number; vence: string | null; falladas: number[] };

function Examen({ criterio, onCerrar }: { criterio: Criterio; onCerrar: () => void }) {
  const [paso, setPaso] = useState(-1);
  const [respuestas, setRespuestas] = useState<number[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [enviando, setEnviando] = useState(false);
  const total = criterio.preguntas.length;

  async function responder(opcion: number) {
    vibrar("toque");
    const nuevas = [...respuestas.slice(0, paso), opcion];
    setRespuestas(nuevas);
    if (paso < total - 1) {
      setPaso(paso + 1);
      return;
    }
    setEnviando(true);
    const res = await fetch("/api/certificaciones/examen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroParte: criterio.numeroParte, respuestas: nuevas }),
    });
    setEnviando(false);
    const d = await res.json();
    vibrar(d.aprobado ? "exito" : "error");
    setResultado(d);
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-navy-100 px-5 py-3">
        <p className="font-display font-bold text-navy-900">🎓 {criterio.numeroParte}</p>
        <button onClick={onCerrar} className="rounded-md p-1 text-navy-400 hover:bg-navy-50" aria-label="Cerrar">
          ✕
        </button>
      </div>
      {paso >= 0 && !resultado && (
        <div className="h-1.5 bg-navy-100">
          <motion.div className="h-full bg-yellow" animate={{ width: `${(paso / total) * 100}%` }} />
        </div>
      )}
      <div className="min-h-[320px] p-5">
        <AnimatePresence mode="wait">
          {resultado ? (
            <motion.div key="resultado" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center">
              <motion.p
                className="text-6xl"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 12 }}
              >
                {resultado.aprobado ? "🎓" : "📚"}
              </motion.p>
              <p className="font-display text-2xl font-extrabold text-navy-900">
                {resultado.aprobado ? "¡Certificado!" : "Casi, vuelve a intentarlo"}
              </p>
              <p className={`font-display text-5xl font-black ${resultado.aprobado ? "text-emerald-600" : "text-red-600"}`}>
                {resultado.calificacion}%
              </p>
              <p className="text-sm text-navy-500">
                {resultado.correctas} de {resultado.total} correctas · mínimo {resultado.minima}%
                {resultado.vence ? ` · vigente hasta ${fecha(resultado.vence)}` : ""}
              </p>
              {!resultado.aprobado && resultado.falladas.length > 0 && (
                <div className="rounded-lg bg-amber-50 p-3 text-left text-sm text-amber-900">
                  <p className="font-semibold">Repasa estas preguntas:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {resultado.falladas.map((i) => (
                      <li key={i}>{criterio.preguntas[i]?.texto}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-center gap-2">
                {!resultado.aprobado && (
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setResultado(null);
                      setRespuestas([]);
                      setPaso(-1);
                    }}
                  >
                    Repasar y reintentar
                  </button>
                )}
                <button className="btn-accent" onClick={onCerrar}>
                  Listo
                </button>
              </div>
            </motion.div>
          ) : paso === -1 ? (
            <motion.div key="estudio" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Criterio de aceptación</p>
              <p className="whitespace-pre-wrap text-sm text-navy-800">{criterio.descripcion}</p>
              {(criterio.fotoOkUrl || criterio.fotoNgUrl) && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { url: criterio.fotoOkUrl, texto: "✅ Pieza OK", clase: "ring-emerald-400" },
                    { url: criterio.fotoNgUrl, texto: "❌ Pieza NG", clase: "ring-red-400" },
                  ].map((f) =>
                    f.url ? (
                      <figure key={f.texto} className="text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.url} alt={f.texto} className={`aspect-square w-full rounded-xl object-cover ring-4 ${f.clase}`} />
                        <figcaption className="mt-1 text-sm font-semibold text-navy-700">{f.texto}</figcaption>
                      </figure>
                    ) : (
                      <div key={f.texto} />
                    )
                  )}
                </div>
              )}
              <button className="btn-accent w-full" onClick={() => setPaso(0)}>
                Ya lo revisé · empezar examen ({total} preguntas)
              </button>
            </motion.div>
          ) : (
            <motion.div key={paso} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
                Pregunta {paso + 1} de {total}
              </p>
              <p className="font-display text-lg font-bold text-navy-900">{criterio.preguntas[paso].texto}</p>
              <div className="space-y-2">
                {criterio.preguntas[paso].opciones.map((o, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.97 }}
                    disabled={enviando}
                    onClick={() => responder(i)}
                    className="flex w-full items-center gap-3 rounded-xl border border-navy-200 px-4 py-3 text-left text-sm font-medium text-navy-800 transition hover:border-navy hover:bg-navy-50 disabled:opacity-50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {o}
                  </motion.button>
                ))}
              </div>
              {paso > 0 && (
                <button className="text-xs font-semibold text-navy-400 hover:text-navy-700" onClick={() => setPaso(paso - 1)}>
                  ← Pregunta anterior
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------- Liderazgo ---------------- */

function VistaLiderazgo({ datos, recargar, puedeEditar }: { datos: Datos; recargar: () => void; puedeEditar: boolean }) {
  const toast = useToast();
  const [pestana, setPestana] = useState<"matriz" | "criterios">("matriz");
  const [editando, setEditando] = useState<Criterio | "nuevo" | null>(null);

  async function alternar(usuarioId: string, numeroParte: string, cert: Certificacion | undefined, nombre: string) {
    if (!puedeEditar) return;
    const revocar = cert && estadoDe(cert).clave !== "vencida";
    if (revocar && !window.confirm(`¿Revocar la certificación de ${nombre} en ${numeroParte}?`)) return;
    const res = await fetch("/api/certificaciones/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId, numeroParte, accion: revocar ? "revocar" : "otorgar" }),
    });
    if (!res.ok) {
      toast.error("No se pudo actualizar");
      return;
    }
    toast.exito(revocar ? `Certificación revocada (${nombre})` : `${nombre} certificado en ${numeroParte}`);
    recargar();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">🎓 Certificaciones</h1>
          <p className="text-sm text-navy-500">
            Si una pieza tiene criterio, solo se asignan inspectores certificados en ella (IATF 16949 § 7.2).
          </p>
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-full border border-navy-200 bg-white p-1">
            {(["matriz", "criterios"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPestana(p)}
                className={`relative rounded-full px-3.5 py-1.5 text-sm font-semibold ${pestana === p ? "text-white" : "text-navy-500"}`}
              >
                {pestana === p && <motion.span layoutId="pestana-cert" className="absolute inset-0 rounded-full bg-navy" />}
                <span className="relative">{p === "matriz" ? "Matriz de habilidades" : "Criterios y exámenes"}</span>
              </button>
            ))}
          </div>
          {puedeEditar && (
            <button className="btn-accent" onClick={() => setEditando("nuevo")}>
              + Criterio
            </button>
          )}
        </div>
      </div>

      {datos.criterios.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-5xl">🎓</span>
          <p className="max-w-md text-sm text-navy-500">
            Crea el criterio de un número de parte (qué es OK y qué es NG, con fotos) y un examen corto. Los inspectores se
            certifican desde su celular.
          </p>
          {puedeEditar && (
            <button className="btn-primary" onClick={() => setEditando("nuevo")}>
              Crear el primer criterio
            </button>
          )}
        </div>
      ) : pestana === "matriz" ? (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-xs uppercase text-navy-500">
              <tr>
                <th className="sticky left-0 bg-navy-50 px-4 py-3 text-left">Inspector</th>
                {datos.criterios.map((c) => (
                  <th key={c.id} className="px-3 py-3 text-center">
                    {c.numeroParte}
                  </th>
                ))}
                <th className="px-3 py-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {datos.inspectores.map((ins) => {
                let total = 0;
                return (
                  <tr key={ins.id}>
                    <td className="sticky left-0 bg-white px-4 py-2.5 font-medium text-navy-900">{ins.nombre}</td>
                    {datos.criterios.map((c) => {
                      const cert = datos.certificaciones.find((x) => x.usuarioId === ins.id && x.numeroParte === c.numeroParte);
                      const e = estadoDe(cert);
                      if (e.clave === "vigente" || e.clave === "porVencer") total++;
                      return (
                        <td key={c.id} className="px-3 py-2 text-center">
                          <button
                            disabled={!puedeEditar}
                            onClick={() => alternar(ins.id, c.numeroParte, cert, ins.nombre)}
                            title={
                              cert
                                ? `${e.texto} · ${cert.metodo === "examen" ? `examen ${cert.calificacion}%` : `manual por ${cert.otorgadaPor?.nombre ?? "—"}`} · vence ${fecha(cert.vence)}`
                                : puedeEditar
                                  ? "Clic para certificar manualmente"
                                  : "Sin certificar"
                            }
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition hover:scale-110 disabled:hover:scale-100 ${e.clase}`}
                          >
                            {e.icono}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-semibold text-navy-700">
                      {total}/{datos.criterios.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-4 border-t border-navy-100 px-4 py-3 text-xs text-navy-500">
            <span><span className="badge bg-emerald-100 text-emerald-700">✓</span> Certificado</span>
            <span><span className="badge bg-amber-100 text-amber-800">!</span> Vence en {DIAS_AVISO} días o menos</span>
            <span><span className="badge bg-red-100 text-red-700">✕</span> Vencida</span>
            <span><span className="badge bg-navy-50 text-navy-400">—</span> Sin certificar</span>
            {puedeEditar && <span>Clic en una celda para certificar o revocar manualmente.</span>}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {datos.criterios.map((c) => {
            const certificados = datos.certificaciones.filter((x) => x.numeroParte === c.numeroParte && estadoDe(x).clave !== "vencida").length;
            return (
              <div key={c.id} className="card flex flex-col gap-2">
                <p className="font-display text-lg font-bold text-navy-900">{c.numeroParte}</p>
                <p className="line-clamp-3 text-sm text-navy-600">{c.descripcion}</p>
                <p className="text-xs text-navy-400">
                  {c.preguntas.length} preguntas · vigencia {c.vigenciaDias} días · {certificados} certificado(s)
                </p>
                {puedeEditar && (
                  <button className="btn-secondary mt-auto self-start px-3 py-1.5 text-sm" onClick={() => setEditando(c)}>
                    Editar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal abierto={Boolean(editando)} onCerrar={() => setEditando(null)}>
        {editando && (
          <EditorCriterio
            criterio={editando === "nuevo" ? null : editando}
            onCerrar={() => setEditando(null)}
            onGuardado={() => {
              setEditando(null);
              recargar();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function SubirFoto({ etiqueta, url, onUrl }: { etiqueta: string; url: string | null; onUrl: (u: string | null) => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const toast = useToast();
  async function subir(archivo: File) {
    setSubiendo(true);
    const form = new FormData();
    form.append("foto", await comprimirImagen(archivo));
    const res = await fetch("/api/upload", { method: "POST", body: form }).catch(() => null);
    setSubiendo(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      toast.error(d?.error ?? "No se pudo subir la foto");
      return;
    }
    onUrl(d.url);
  }
  return (
    <label className="block cursor-pointer">
      <span className="label">{etiqueta}</span>
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-navy-200 bg-navy-50 text-sm text-navy-400">
        {subiendo ? (
          "Subiendo…"
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={etiqueta} className="h-full w-full object-cover" />
        ) : (
          "📷 Agregar foto"
        )}
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])} />
    </label>
  );
}

function EditorCriterio({ criterio, onCerrar, onGuardado }: { criterio: Criterio | null; onCerrar: () => void; onGuardado: () => void }) {
  const toast = useToast();
  const [numeroParte, setNumeroParte] = useState(criterio?.numeroParte ?? "");
  const [descripcion, setDescripcion] = useState(criterio?.descripcion ?? "");
  const [fotoOkUrl, setFotoOk] = useState<string | null>(criterio?.fotoOkUrl ?? null);
  const [fotoNgUrl, setFotoNg] = useState<string | null>(criterio?.fotoNgUrl ?? null);
  const [vigenciaDias, setVigencia] = useState(String(criterio?.vigenciaDias ?? 365));
  const [preguntas, setPreguntas] = useState<Required<Pregunta>[]>(
    (criterio?.preguntas as Required<Pregunta>[]) ?? [{ texto: "", opciones: ["", ""], correcta: 0 }]
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (i: number, cambios: Partial<Required<Pregunta>>) =>
    setPreguntas((l) => l.map((p, idx) => (idx === i ? { ...p, ...cambios } : p)));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/certificaciones/criterios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroParte, descripcion, fotoOkUrl, fotoNgUrl, vigenciaDias: Number(vigenciaDias), preguntas }),
    });
    setEnviando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error ?? "No se pudo guardar");
      return;
    }
    toast.exito(`Criterio de ${numeroParte} guardado`);
    onGuardado();
  }

  async function eliminar() {
    if (!criterio || !window.confirm(`¿Eliminar el criterio de ${criterio.numeroParte}? Dejará de exigirse certificación.`)) return;
    await fetch(`/api/certificaciones/criterios/${criterio.id}`, { method: "DELETE" });
    toast.info("Criterio eliminado");
    onGuardado();
  }

  return (
    <form onSubmit={guardar} className="max-h-[85vh] space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
      <h2 className="font-display text-lg font-bold text-navy-900">{criterio ? `Criterio ${criterio.numeroParte}` : "Nuevo criterio"}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label">Número de parte</label>
          <input className="input" required value={numeroParte} disabled={Boolean(criterio)} onChange={(e) => setNumeroParte(e.target.value)} />
        </div>
        <div>
          <label className="label">Vigencia (días)</label>
          <input className="input" type="number" min={7} max={1095} value={vigenciaDias} onChange={(e) => setVigencia(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Criterio de aceptación</label>
        <textarea className="input" rows={3} required minLength={5} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SubirFoto etiqueta="✅ Foto de pieza OK" url={fotoOkUrl} onUrl={setFotoOk} />
        <SubirFoto etiqueta="❌ Foto de pieza NG" url={fotoNgUrl} onUrl={setFotoNg} />
      </div>

      <div className="space-y-3">
        <p className="label">Examen (marca la respuesta correcta)</p>
        {preguntas.map((p, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-navy-100 p-3">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder={`Pregunta ${i + 1}`}
                value={p.texto}
                onChange={(e) => cambiar(i, { texto: e.target.value })}
              />
              {preguntas.length > 1 && (
                <button type="button" className="px-2 text-navy-400 hover:text-red-600" onClick={() => setPreguntas((l) => l.filter((_, x) => x !== i))}>
                  ✕
                </button>
              )}
            </div>
            {p.opciones.map((o, j) => (
              <div key={j} className="flex items-center gap-2">
                <input type="radio" name={`correcta-${i}`} checked={p.correcta === j} onChange={() => cambiar(i, { correcta: j })} />
                <input
                  className="input flex-1 py-1.5"
                  placeholder={`Opción ${String.fromCharCode(65 + j)}`}
                  value={o}
                  onChange={(e) => cambiar(i, { opciones: p.opciones.map((x, k) => (k === j ? e.target.value : x)) })}
                />
                {p.opciones.length > 2 && (
                  <button
                    type="button"
                    className="text-xs text-navy-400 hover:text-red-600"
                    onClick={() =>
                      cambiar(i, {
                        opciones: p.opciones.filter((_, k) => k !== j),
                        correcta: p.correcta === j ? 0 : p.correcta > j ? p.correcta - 1 : p.correcta,
                      })
                    }
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {p.opciones.length < 5 && (
              <button type="button" className="text-xs font-semibold text-navy hover:underline" onClick={() => cambiar(i, { opciones: [...p.opciones, ""] })}>
                + Opción
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-sm font-semibold text-navy hover:underline"
          onClick={() => setPreguntas((l) => [...l, { texto: "", opciones: ["", ""], correcta: 0 }])}
        >
          + Agregar pregunta
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        {criterio ? (
          <button type="button" className="text-sm font-semibold text-red-600 hover:underline" onClick={eliminar}>
            Eliminar criterio
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}
