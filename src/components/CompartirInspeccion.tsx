"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useIdioma } from "@/components/ui/Idioma";

type Enlace = {
  id: string;
  token: string;
  expiraEn: string | null;
  vistas: number;
  ultimaVista: string | null;
  creadoEn: string;
  creadoPor: { nombre: string };
};

const VIGENCIAS = [
  { dias: 7, etiqueta: "7 días", en: "7 days" },
  { dias: 30, etiqueta: "30 días", en: "30 days" },
  { dias: 90, etiqueta: "90 días", en: "90 days" },
  { dias: null, etiqueta: "Sin vencimiento", en: "No expiry" },
];

export default function CompartirInspeccion({ inspeccionId, nombre }: { inspeccionId: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const { t } = useIdioma();
  return (
    <>
      <button className="btn-secondary" onClick={() => setAbierto(true)}>
        🔗 {t("Compartir", "Share")}
      </button>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)}>
        {abierto && <Panel inspeccionId={inspeccionId} nombre={nombre} onCerrar={() => setAbierto(false)} />}
      </Modal>
    </>
  );
}

function Panel({ inspeccionId, nombre, onCerrar }: { inspeccionId: string; nombre: string; onCerrar: () => void }) {
  const toast = useToast();
  const { t, locale } = useIdioma();
  const [enlaces, setEnlaces] = useState<Enlace[] | null>(null);
  const [dias, setDias] = useState<number | null>(30);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(() => {
    fetch(`/api/inspecciones/${inspeccionId}/enlaces`)
      .then((r) => r.json())
      .then((d) => setEnlaces(Array.isArray(d) ? d : []));
  }, [inspeccionId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const urlDe = (token: string) => `${window.location.origin}/compartido/${token}`;

  async function copiar(token: string) {
    try {
      await navigator.clipboard.writeText(urlDe(token));
      toast.exito(t("Enlace copiado", "Link copied"));
    } catch {
      toast.error(t("No se pudo copiar; mantén presionado el enlace para copiarlo", "Could not copy; long-press the link to copy it"));
    }
  }

  async function crear() {
    setCreando(true);
    const res = await fetch(`/api/inspecciones/${inspeccionId}/enlaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dias }),
    });
    setCreando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? t("No se pudo crear el enlace", "Could not create the link"));
      return;
    }
    const nuevo: Enlace = await res.json();
    cargar();
    copiar(nuevo.token);
  }

  async function revocar(id: string) {
    const res = await fetch(`/api/enlaces/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? t("No se pudo revocar", "Could not revoke"));
      return;
    }
    toast.info(t("Enlace revocado: ya no abre", "Link revoked: it no longer opens"));
    cargar();
  }

  return (
    <div className="space-y-4 rounded-xl bg-white p-5 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-navy-900">🔗 {t("Compartir en vivo", "Share live")}</h2>
          <p className="text-sm text-navy-500">
            {t(
              `Quien tenga el enlace ve el avance, el Pareto y las fotos de ${nombre}, sin necesitar cuenta. No muestra precios ni datos internos.`,
              `Anyone with the link sees progress, the Pareto and photos for ${nombre}, no account needed. Prices and internal data are never shown.`
            )}
          </p>
        </div>
        <button onClick={onCerrar} className="rounded-md p-1 text-navy-400 hover:bg-navy-50" aria-label={t("Cerrar", "Close")}>
          ✕
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-navy-50 p-3">
        <div className="flex-1">
          <label className="label">{t("Vigencia", "Valid for")}</label>
          <div className="flex flex-wrap gap-1.5">
            {VIGENCIAS.map((v) => (
              <button
                key={v.etiqueta}
                type="button"
                onClick={() => setDias(v.dias)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  dias === v.dias ? "border-navy bg-navy text-white" : "border-navy-200 bg-white text-navy-600"
                }`}
              >
                {t(v.etiqueta, v.en)}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-accent" onClick={crear} disabled={creando}>
          {creando ? t("Creando…", "Creating…") : t("Crear y copiar", "Create & copy")}
        </button>
      </div>

      <div>
        <p className="label">{t("Enlaces activos", "Active links")}</p>
        {enlaces === null ? (
          <div className="skeleton h-16 rounded-lg" />
        ) : enlaces.length === 0 ? (
          <p className="text-sm text-navy-400">{t("Ninguno todavía.", "None yet.")}</p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {enlaces.map((e) => (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-lg border border-navy-100 p-3"
                >
                  <p className="truncate font-mono text-xs text-navy-600">{urlDe(e.token)}</p>
                  <p className="mt-1 text-xs text-navy-400">
                    {e.expiraEn
                      ? `${t("Vence", "Expires")} ${new Date(e.expiraEn).toLocaleDateString(locale, { day: "2-digit", month: "short" })}`
                      : t("Sin vencimiento", "No expiry")}{" "}
                    · 👁️ {e.vistas} {t("vista", "view")}
                    {e.vistas === 1 ? "" : "s"} · {t("por", "by")} {e.creadoPor.nombre}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn-primary px-3 py-1 text-xs" onClick={() => copiar(e.token)}>
                      {t("Copiar", "Copy")}
                    </button>
                    <a
                      className="inline-flex items-center rounded-lg bg-[#25D366] px-3 py-1 text-xs font-semibold text-white"
                      href={`https://wa.me/?text=${encodeURIComponent(`${t("Avance en vivo de", "Live progress for")} ${nombre}: ${urlDe(e.token)}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                    <a
                      className="btn-secondary px-3 py-1 text-xs"
                      href={`/compartido/${e.token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("Ver", "View")}
                    </a>
                    <button
                      className="ml-auto text-xs font-semibold text-red-600 hover:underline"
                      onClick={() => revocar(e.id)}
                    >
                      {t("Revocar", "Revoke")}
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
