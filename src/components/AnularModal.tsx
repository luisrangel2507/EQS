"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useIdioma } from "@/components/ui/Idioma";

/** Pide el motivo de una anulación (obligatorio) y la ejecuta con DELETE + { motivo }. */
export default function AnularModal({
  abierto,
  titulo,
  descripcion,
  url,
  onCerrar,
  onAnulado,
}: {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  url: string;
  onCerrar: () => void;
  onAnulado: () => void;
}) {
  const { t } = useIdioma();
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function anular() {
    setEnviando(true);
    setError("");
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    }).catch(() => null);
    setEnviando(false);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      setError(d?.error ?? t("No se pudo anular. Revisa tu conexión.", "Could not void. Check your connection."));
      return;
    }
    setMotivo("");
    onAnulado();
  }

  return (
    <Modal abierto={abierto} onCerrar={enviando ? () => {} : onCerrar} ancho="max-w-md">
      <div className="card space-y-4 p-6">
        <div>
          <h2 className="font-display text-lg font-bold text-navy-900">{titulo}</h2>
          <p className="mt-1 text-sm text-navy-500">
            {descripcion ??
              t(
                "El registro dejará de aparecer en listas y reportes, pero queda guardado en la bitácora con tu nombre y el motivo.",
                "The record will no longer show in lists and reports, but it stays in the change log with your name and the reason."
              )}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="motivo-anulacion">
            {t("Motivo (obligatorio)", "Reason (required)")}
          </label>
          <textarea
            id="motivo-anulacion"
            className="input min-h-[96px]"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            placeholder={t("Ej. Captura duplicada por error de estación", "E.g. Duplicate entry from a station mistake")}
          />
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCerrar} disabled={enviando}>
            {t("Cancelar", "Cancel")}
          </button>
          <button
            className="btn-primary !bg-red-600 hover:!bg-red-700"
            onClick={anular}
            disabled={enviando || motivo.trim().length < 5}
          >
            {enviando ? t("Anulando…", "Voiding…") : t("Anular", "Void")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
