"use client";

import { useState } from "react";
import { usePolling } from "@/lib/usePolling";
import { useIdioma } from "@/components/ui/Idioma";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import { SkeletonPagina } from "@/components/ui/Skeleton";
import { TIPOS_DOCUMENTO } from "@/lib/documentos";

type Fila = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  numeroParte: string | null;
  vigente: { id: string; version: number; archivoUrl: string; vigenteDesde: string | null; leido: boolean } | null;
  pendiente: { id: string; version: number } | null;
};

type Version = {
  id: string;
  version: number;
  archivoUrl: string;
  cambios: string;
  estado: string;
  creadoEn: string;
  creadoPor: { id: string; nombre: string };
  revisadoPor: { nombre: string } | null;
  revisadoEn: string | null;
  motivoDecision: string | null;
  vigenteDesde: string | null;
  leido: boolean;
  _count: { lecturas: number };
};

type Detalle = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  numeroParte: string | null;
  descripcion: string | null;
  versiones: Version[];
  inspectoresActivos: number;
  puedeSubirVersion: boolean;
  puedeAprobar: boolean;
  unicoAprobador: boolean;
  usuarioId: string;
};

const ESTADOS: Record<string, [string, string, string]> = {
  vigente: ["Vigente", "Current", "bg-emerald-50 text-emerald-700"],
  en_revision: ["En revisión", "In review", "bg-amber-50 text-amber-700"],
  obsoleta: ["Obsoleta", "Obsolete", "bg-navy-100 text-navy-500"],
  rechazada: ["Rechazada", "Rejected", "bg-red-50 text-red-700"],
};

async function subirPdf(archivo: File): Promise<string> {
  const fd = new FormData();
  fd.append("archivo", archivo);
  const r = await fetch("/api/upload", { method: "POST", body: fd });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "No se pudo subir el archivo");
  return d.url;
}

export default function DocumentosClient({ puedeCrear }: { puedeCrear: boolean }) {
  const { t, locale } = useIdioma();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const { datos, cargando, recargar } = usePolling<Fila[]>("/api/documentos", 30000);

  if (cargando && !datos) return <SkeletonPagina />;
  const filas = (datos ?? []).filter((d) => `${d.codigo} ${d.titulo} ${d.numeroParte ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const tipoTxt = (v: string) => {
    const x = TIPOS_DOCUMENTO.find((e) => e[0] === v);
    return x ? t(x[1], x[2]) : v;
  };
  const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "—");

  return (
    <div className="carga-suave space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">{t("Control de documentos", "Document control")}</h1>
          <p className="text-sm text-navy-500">
            {t(
              "Instrucciones de trabajo y procedimientos con versión vigente, aprobación y evidencia de lectura.",
              "Work instructions and procedures with a current version, approval and read confirmation."
            )}
          </p>
        </div>
        {puedeCrear && (
          <button className="btn-primary" onClick={() => setNuevo(true)}>
            {t("Nuevo documento", "New document")}
          </button>
        )}
      </div>

      <input className="input" placeholder={t("Buscar por código, título o número de parte…", "Search by code, title or part number…")} value={q} onChange={(e) => setQ(e.target.value)} />

      {!filas.length ? (
        <div className="card p-10 text-center text-sm text-navy-500">{t("Todavía no hay documentos.", "No documents yet.")}</div>
      ) : (
        <div className="card divide-y divide-navy-100 overflow-hidden !p-0">
          {filas.map((d) => (
            <button key={d.id} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-left transition hover:bg-navy-50" onClick={() => setAbierto(d.id)}>
              <span className="w-28 shrink-0 font-mono text-sm font-semibold text-navy-700">{d.codigo}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-navy-900">{d.titulo}</span>
                <span className="block text-xs text-navy-500">
                  {tipoTxt(d.tipo)}
                  {d.numeroParte ? ` · ${d.numeroParte}` : ""}
                </span>
              </span>
              {d.vigente && <span className="text-xs text-navy-500">v{d.vigente.version} · {fecha(d.vigente.vigenteDesde)}</span>}
              {d.vigente && !d.vigente.leido && <span className="badge bg-amber-50 text-amber-700">{t("Por leer", "Unread")}</span>}
              {d.pendiente && <span className="badge bg-amber-50 text-amber-700">{t(`v${d.pendiente.version} en revisión`, `v${d.pendiente.version} in review`)}</span>}
              {!d.vigente && <span className="badge bg-navy-100 text-navy-500">{t("Sin versión vigente", "No current version")}</span>}
            </button>
          ))}
        </div>
      )}

      <Modal abierto={nuevo} onCerrar={() => setNuevo(false)}>
        <NuevoDocumento
          onCerrar={() => setNuevo(false)}
          onCreado={() => {
            setNuevo(false);
            toast.exito(t("Documento enviado a revisión", "Document sent for review"));
            recargar();
          }}
        />
      </Modal>

      <Modal abierto={Boolean(abierto)} onCerrar={() => setAbierto(null)} ancho="max-w-2xl">
        {abierto && <DetalleDocumento id={abierto} fecha={fecha} tipoTxt={tipoTxt} onCambio={recargar} />}
      </Modal>
    </div>
  );
}

function NuevoDocumento({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: () => void }) {
  const { t } = useIdioma();
  const [f, setF] = useState({ codigo: "", titulo: "", tipo: "instruccion", numeroParte: "", descripcion: "" });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) return setError(t("Adjunta el PDF del documento", "Attach the document PDF"));
    setEnviando(true);
    setError("");
    try {
      const archivoUrl = await subirPdf(archivo);
      const r = await fetch("/api/documentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, archivoUrl }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "No se pudo guardar");
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
    setEnviando(false);
  }

  return (
    <form onSubmit={guardar} className="card space-y-3 p-6">
      <h2 className="font-display text-lg font-bold text-navy-900">{t("Nuevo documento", "New document")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">{t("Código", "Code")}</label>
          <input className="input" required value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} placeholder="IT-001" />
        </div>
        <div>
          <label className="label">{t("Tipo", "Type")}</label>
          <select className="input" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            {TIPOS_DOCUMENTO.map(([v, es, en]) => (
              <option key={v} value={v}>
                {t(es, en)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">{t("Título", "Title")}</label>
        <input className="input" required minLength={3} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
      </div>
      <div>
        <label className="label">{t("Número de parte (opcional)", "Part number (optional)")}</label>
        <input className="input" value={f.numeroParte} onChange={(e) => setF({ ...f, numeroParte: e.target.value })} />
      </div>
      <div>
        <label className="label">PDF</label>
        <input className="input" type="file" accept="application/pdf" required onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      </div>
      <p className="text-xs text-navy-500">{t("Quedará en revisión hasta que otra persona autorizada lo apruebe.", "It stays in review until another authorized person approves it.")}</p>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar}>
          {t("Cancelar", "Cancel")}
        </button>
        <button className="btn-primary" disabled={enviando}>
          {enviando ? t("Guardando…", "Saving…") : t("Enviar a revisión", "Send for review")}
        </button>
      </div>
    </form>
  );
}

function DetalleDocumento({ id, fecha, tipoTxt, onCambio }: { id: string; fecha: (i: string | null) => string; tipoTxt: (v: string) => string; onCambio: () => void }) {
  const { t } = useIdioma();
  const toast = useToast();
  const { datos: doc, recargar } = usePolling<Detalle>(`/api/documentos/${id}`, 15000);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cambios, setCambios] = useState("");
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  if (!doc) return <div className="card p-8 text-center text-sm text-navy-500">…</div>;

  async function llamar(url: string, cuerpo: unknown, ok: string) {
    setOcupado(true);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }).catch(() => null);
    setOcupado(false);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) return toast.error(d?.error ?? t("No se pudo completar", "Could not complete"));
    toast.exito(ok);
    setMotivo("");
    recargar();
    onCambio();
  }

  async function subirVersion(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    setOcupado(true);
    try {
      const archivoUrl = await subirPdf(archivo);
      setOcupado(false);
      await llamar(`/api/documentos/${doc!.id}/versiones`, { archivoUrl, cambios }, t("Versión enviada a revisión", "Version sent for review"));
      setArchivo(null);
      setCambios("");
    } catch (err) {
      setOcupado(false);
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  const enRevision = doc.versiones.some((v) => v.estado === "en_revision");

  return (
    <div className="card space-y-4 p-6">
      <div>
        <p className="font-mono text-sm font-semibold text-navy-500">{doc.codigo}</p>
        <h2 className="font-display text-xl font-bold text-navy-900">{doc.titulo}</h2>
        <p className="text-xs text-navy-500">
          {tipoTxt(doc.tipo)}
          {doc.numeroParte ? ` · ${doc.numeroParte}` : ""}
        </p>
      </div>

      <div className="space-y-3">
        {doc.versiones.map((v) => {
          const [es, en, clase] = ESTADOS[v.estado] ?? [v.estado, v.estado, "bg-navy-50 text-navy-700"];
          const soyAutor = v.creadoPor.id === doc.usuarioId;
          return (
            <div key={v.id} className="rounded-xl border border-navy-100 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-navy-900">v{v.version}</span>
                <span className={`badge ${clase}`}>{t(es, en)}</span>
                <a className="ml-auto text-sm font-semibold text-navy-600 underline" href={v.archivoUrl} target="_blank" rel="noreferrer">
                  {t("Abrir PDF", "Open PDF")}
                </a>
              </div>
              <p className="mt-1 text-sm text-navy-800">{v.cambios}</p>
              <p className="mt-1 text-xs text-navy-500">
                {t("Elaboró", "Prepared by")} {v.creadoPor.nombre} · {fecha(v.creadoEn)}
                {v.revisadoPor ? ` · ${v.estado === "rechazada" ? t("Rechazó", "Rejected by") : t("Aprobó", "Approved by")} ${v.revisadoPor.nombre} · ${fecha(v.revisadoEn)}` : ""}
              </p>
              {v.motivoDecision && <p className="mt-1 text-xs text-navy-600">{t("Motivo", "Reason")}: {v.motivoDecision}</p>}

              {v.estado === "vigente" && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-navy-500">
                  <span>
                    {t("Lecturas confirmadas", "Confirmed reads")}: {v._count.lecturas}
                  </span>
                  {!v.leido && (
                    <button className="btn-secondary !px-3 !py-1 text-xs" disabled={ocupado} onClick={() => llamar(`/api/documentos/versiones/${v.id}/leido`, {}, t("Lectura confirmada", "Read confirmed"))}>
                      {t("Confirmo que lo leí", "I confirm I read it")}
                    </button>
                  )}
                  {v.leido && <span className="font-semibold text-emerald-700">✓ {t("Ya lo confirmaste", "You confirmed")}</span>}
                </div>
              )}

              {doc.puedeAprobar && (v.estado === "en_revision" || v.estado === "vigente") && (
                <div className="mt-3 space-y-2 border-t border-navy-100 pt-3">
                  <input className="input" placeholder={v.estado === "vigente" ? t("Motivo del retiro", "Reason for withdrawal") : t("Motivo (obligatorio al rechazar)", "Reason (required when rejecting)")} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    {v.estado === "en_revision" && (
                      <>
                        <button className="btn-primary" disabled={ocupado || (soyAutor && !doc.unicoAprobador)} onClick={() => llamar(`/api/documentos/versiones/${v.id}/decision`, { accion: "aprobar", motivo }, t("Versión aprobada", "Version approved"))}>
                          {t("Aprobar", "Approve")}
                        </button>
                        <button className="btn-secondary text-red-600" disabled={ocupado || motivo.trim().length < 5} onClick={() => llamar(`/api/documentos/versiones/${v.id}/decision`, { accion: "rechazar", motivo }, t("Versión rechazada", "Version rejected"))}>
                          {t("Rechazar", "Reject")}
                        </button>
                        {soyAutor && !doc.unicoAprobador && <span className="self-center text-xs text-navy-500">{t("Debe aprobarlo otra persona.", "Another person must approve it.")}</span>}
                      </>
                    )}
                    {v.estado === "vigente" && (
                      <button className="btn-secondary text-red-600" disabled={ocupado || motivo.trim().length < 5} onClick={() => llamar(`/api/documentos/versiones/${v.id}/decision`, { accion: "retirar", motivo }, t("Versión retirada", "Version withdrawn"))}>
                        {t("Retirar (obsoleta)", "Withdraw (obsolete)")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {doc.puedeSubirVersion && !enRevision && (
        <form onSubmit={subirVersion} className="space-y-2 rounded-xl bg-navy-50 p-3">
          <p className="text-sm font-semibold text-navy-900">{t("Subir nueva versión", "Upload new version")}</p>
          <input className="input" type="file" accept="application/pdf" required onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          <input className="input" required minLength={5} placeholder={t("¿Qué cambió?", "What changed?")} value={cambios} onChange={(e) => setCambios(e.target.value)} />
          <button className="btn-primary" disabled={ocupado}>
            {t("Enviar a revisión", "Send for review")}
          </button>
        </form>
      )}
    </div>
  );
}
