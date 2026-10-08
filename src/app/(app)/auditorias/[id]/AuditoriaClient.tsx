"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SkeletonPagina } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import AnularModal from "@/components/AnularModal";
import { comprimirImagen } from "@/lib/imagen";
import { vibrar } from "@/lib/feedback";
import { TIPOS_AUDITORIA, type ItemChecklist, type Respuesta } from "@/lib/auditorias";
import { AnilloPuntaje } from "../AuditoriasClient";
import { useIdioma } from "@/components/ui/Idioma";
import Icono from "@/components/ui/Icono";

type Auditoria = {
  id: string;
  folio: number;
  nombrePlantilla: string;
  tipo: string;
  items: ItemChecklist[];
  respuestas: Respuesta[];
  planta: string | null;
  cliente: string | null;
  area: string | null;
  estado: "borrador" | "completada";
  puntaje: number | null;
  hallazgos: number;
  createdAt: string;
  completadaEn: string | null;
  auditor: { id: string; nombre: string };
  puedeEditar: boolean;
};

const OPCIONES = [
  { valor: "ok", etiqueta: "Cumple", en: "Pass", activo: "border-emerald-500 bg-emerald-500 text-white" },
  { valor: "no", etiqueta: "No cumple", en: "Fail", activo: "border-red-500 bg-red-500 text-white" },
  { valor: "na", etiqueta: "N/A", en: "N/A", activo: "border-navy-400 bg-navy-400 text-white" },
] as const;

const fecha = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function AuditoriaClient({ id }: { id: string }) {
  const toast = useToast();
  const router = useRouter();
  const { t, locale } = useIdioma();
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [anulando, setAnulando] = useState(false);

  useEffect(() => {
    fetch(`/api/auditorias/${id}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "No se pudo cargar la auditoría");
        const items = Array.isArray(d.items) ? d.items : [];
        const respuestas = Array.isArray(d.respuestas) ? d.respuestas : [];
        setAuditoria({
          ...d,
          items,
          respuestas: items.map(
            (_: ItemChecklist, i: number) => respuestas[i] ?? { resultado: null, comentario: null, fotoUrl: null }
          ),
        });
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error)
    return (
      <div className="card mx-auto max-w-md text-center">
        <p className="text-navy-600">{error}</p>
        <Link href="/auditorias" className="btn-secondary mt-4 inline-flex">
          ← {t("Auditorías", "Audits")}
        </Link>
      </div>
    );
  if (!auditoria) return <SkeletonPagina />;

  const tipo = TIPOS_AUDITORIA[auditoria.tipo] ?? TIPOS_AUDITORIA.otro;
  const contestadas = auditoria.respuestas.filter((r) => r.resultado).length;
  const total = auditoria.items.length;
  const editable = auditoria.puedeEditar && auditoria.estado === "borrador";

  function cambiarLocal(indice: number, r: Respuesta) {
    setAuditoria((a) => (a ? { ...a, respuestas: a.respuestas.map((x, i) => (i === indice ? r : x)) } : a));
  }

  async function guardar(indice: number, r: Respuesta) {
    cambiarLocal(indice, r);
    if (!r.resultado) return;
    const res = await fetch(`/api/auditorias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "responder", indice, ...r }),
    }).catch(() => null);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      toast.error(d?.error ?? t("Sin conexión; no se guardó el punto", "No connection; the item was not saved"));
    }
  }

  async function finalizar() {
    setFinalizando(true);
    const res = await fetch(`/api/auditorias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "finalizar" }),
    }).catch(() => null);
    setFinalizando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      vibrar("error");
      toast.error(d?.error ?? t("No se pudo finalizar", "Could not finish"));
      return;
    }
    vibrar("exito");
    toast.exito(
      d.hallazgos
        ? t(`Auditoría cerrada con ${d.hallazgos} hallazgo(s)`, `Audit closed with ${d.hallazgos} finding(s)`)
        : t("Auditoría cerrada sin hallazgos", "Audit closed with no findings")
    );
    setAuditoria((a) => (a ? { ...a, ...d, items: a.items, respuestas: a.respuestas, puedeEditar: false } : a));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/auditorias" className="text-sm font-semibold text-navy-500 hover:text-navy-900">
        ← {t("Auditorías", "Audits")}
      </Link>

      <div className="card flex flex-wrap items-center gap-4">
        {auditoria.estado === "completada" ? (
          <AnilloPuntaje puntaje={auditoria.puntaje} tamano={72} />
        ) : (
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-navy-50 text-navy-400">
            <Icono nombre="documento" className="h-8 w-8" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
            Folio A-{String(auditoria.folio).padStart(4, "0")} · {t(tipo.etiqueta, tipo.en)}
          </p>
          <h1 className="font-display text-xl font-bold text-navy-900">{auditoria.nombrePlantilla}</h1>
          <p className="text-sm text-navy-500">
            {[auditoria.planta, auditoria.area, auditoria.cliente].filter(Boolean).join(" · ") || t("Sin planta", "No plant")} · {auditoria.auditor.nombre}
          </p>
          <p className="text-xs text-navy-400">
            {auditoria.completadaEn
              ? `${t("Cerrada", "Closed")} ${fecha(auditoria.completadaEn, locale)}`
              : `${t("Iniciada", "Started")} ${fecha(auditoria.createdAt, locale)}`}
          </p>
        </div>
        <div className="flex gap-2">
          {auditoria.estado === "completada" && (
            <a className="btn-secondary" href={`/api/auditorias/${id}/pdf`} target="_blank" rel="noreferrer">
              PDF
            </a>
          )}
          {editable && (
            <button className="btn-secondary text-red-600" onClick={() => setAnulando(true)}>
              {t("Anular", "Void")}
            </button>
          )}
        </div>
      </div>

      {editable && (
        <div className="sticky top-16 z-10 rounded-xl border border-navy-100 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur">
          <div className="mb-1.5 flex justify-between text-xs font-semibold text-navy-600">
            <span>
              {contestadas} {t("de", "of")} {total} {t("puntos", "items")}
            </span>
            <span>{total ? Math.round((contestadas / total) * 100) : 0}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-navy-100">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              animate={{ width: `${total ? (contestadas / total) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      )}

      {auditoria.estado === "completada" && (
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { etiqueta: t("Cumple", "Pass"), valor: auditoria.respuestas.filter((r) => r.resultado === "ok").length, color: "text-emerald-600" },
            { etiqueta: t("Hallazgos", "Findings"), valor: auditoria.hallazgos, color: auditoria.hallazgos ? "text-red-600" : "text-navy-900" },
            { etiqueta: "N/A", valor: auditoria.respuestas.filter((r) => r.resultado === "na").length, color: "text-navy-500" },
          ].map((k) => (
            <div key={k.etiqueta} className="card py-3">
              <p className={`font-display text-2xl font-bold ${k.color}`}>{k.valor}</p>
              <p className="text-xs text-navy-500">{k.etiqueta}</p>
            </div>
          ))}
        </div>
      )}

      <ol className="space-y-3">
        {auditoria.items.map((item, i) => (
          <PuntoChecklist
            key={i}
            indice={i}
            item={item}
            respuesta={auditoria.respuestas[i]}
            editable={editable}
            onCambiarLocal={(r) => cambiarLocal(i, r)}
            onGuardar={(r) => guardar(i, r)}
          />
        ))}
      </ol>

      {editable && (
        <div className="flex justify-end pb-8">
          <button className="btn-primary px-6 py-3 text-base" onClick={finalizar} disabled={finalizando}>
            {finalizando
              ? t("Cerrando…", "Closing…")
              : contestadas < total
                ? t(`Finalizar (faltan ${total - contestadas})`, `Finish (${total - contestadas} left)`)
                : `${t("Finalizar auditoría", "Finish audit")}`}
          </button>
        </div>
      )}
      <AnularModal
        abierto={anulando}
        titulo={t("Anular esta auditoría", "Void this audit")}
        url={`/api/auditorias/${id}`}
        onCerrar={() => setAnulando(false)}
        onAnulado={() => {
          toast.info(t("Auditoría anulada", "Audit voided"));
          router.push("/auditorias");
        }}
      />
    </div>
  );
}

function PuntoChecklist({
  indice,
  item,
  respuesta,
  editable,
  onCambiarLocal,
  onGuardar,
}: {
  indice: number;
  item: ItemChecklist;
  respuesta: Respuesta;
  editable: boolean;
  onCambiarLocal: (r: Respuesta) => void;
  onGuardar: (r: Respuesta) => void;
}) {
  const toast = useToast();
  const { t } = useIdioma();
  const [subiendo, setSubiendo] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const esNo = respuesta.resultado === "no";

  async function subir(archivo: File) {
    setSubiendo(true);
    const form = new FormData();
    form.append("foto", await comprimirImagen(archivo));
    const res = await fetch("/api/upload", { method: "POST", body: form }).catch(() => null);
    setSubiendo(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      toast.error(d?.error ?? t("No se pudo subir la foto", "Could not upload the photo"));
      return;
    }
    onGuardar({ ...respuesta, fotoUrl: d.url });
  }

  const borde =
    respuesta.resultado === "ok"
      ? "border-l-emerald-500"
      : esNo
        ? "border-l-red-500"
        : respuesta.resultado === "na"
          ? "border-l-navy-300"
          : "border-l-transparent";

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(indice * 0.03, 0.3) }}
      className={`card border-l-4 ${borde}`}
    >
      <div className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
          {indice + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-navy-900">
            {item.texto}
            {item.requiereFoto && <span className="ml-1.5 text-xs text-navy-400">{t("foto si no cumple", "photo if it fails")}</span>}
          </p>

          {editable ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {OPCIONES.map((o) => {
                const activo = respuesta.resultado === o.valor;
                return (
                  <motion.button
                    key={o.valor}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      vibrar("toque");
                      onGuardar({
                        resultado: o.valor,
                        comentario: o.valor === "no" ? respuesta.comentario : null,
                        fotoUrl: o.valor === "no" ? respuesta.fotoUrl : null,
                      });
                    }}
                    className={`rounded-xl border-2 px-2 py-2.5 text-sm font-bold transition-colors ${
                      activo ? o.activo : "border-navy-100 bg-white text-navy-600 hover:border-navy-300"
                    }`}
                  >
                    {t(o.etiqueta, o.en)}
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <p className="mt-1 text-sm font-semibold">
              {respuesta.resultado === "ok" && <span className="text-emerald-600">{t("Cumple", "Pass")}</span>}
              {esNo && <span className="text-red-600">{t("No cumple", "Fail")}</span>}
              {respuesta.resultado === "na" && <span className="text-navy-400">{t("No aplica", "Not applicable")}</span>}
              {!respuesta.resultado && <span className="text-navy-300">{t("Sin evaluar", "Not evaluated")}</span>}
            </p>
          )}

          <AnimatePresence initial={false}>
            {esNo && (editable || respuesta.comentario || respuesta.fotoUrl) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2 rounded-xl bg-red-50 p-3">
                  {editable ? (
                    <textarea
                      className="input min-h-[70px] bg-white"
                      placeholder={t("Describe el hallazgo (qué se encontró y dónde)", "Describe the finding (what was found and where)")}
                      value={respuesta.comentario ?? ""}
                      onChange={(e) => onCambiarLocal({ ...respuesta, comentario: e.target.value })}
                      onBlur={(e) => onGuardar({ ...respuesta, comentario: e.target.value.trim() || null })}
                    />
                  ) : (
                    respuesta.comentario && <p className="text-sm text-red-900">{respuesta.comentario}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    {respuesta.fotoUrl && (
                      <a href={respuesta.fotoUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={respuesta.fotoUrl} alt={`${t("Hallazgo punto", "Finding item")} ${indice + 1}`} className="h-24 w-24 rounded-lg object-cover" />
                      </a>
                    )}
                    {editable && (
                      <>
                        <input
                          ref={input}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) subir(f);
                            e.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          className="btn-secondary text-sm"
                          disabled={subiendo}
                          onClick={() => input.current?.click()}
                        >
                          {subiendo
                            ? t("Subiendo…", "Uploading…")
                            : respuesta.fotoUrl
                              ? `${t("Cambiar foto", "Change photo")}`
                              : `${t("Foto", "Photo")}${item.requiereFoto ? ` ${t("(obligatoria)", "(required)")}` : ""}`}
                        </button>
                        {respuesta.fotoUrl && (
                          <button
                            type="button"
                            className="text-xs font-semibold text-navy-500 hover:text-red-600"
                            onClick={() => onGuardar({ ...respuesta, fotoUrl: null })}
                          >
                            {t("Quitar", "Remove")}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.li>
  );
}
