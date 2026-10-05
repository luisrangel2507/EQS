"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import { DISCIPLINAS, avance8D, type ClaveDisciplina } from "@/lib/ochoD";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useIdioma } from "@/components/ui/Idioma";
import { nombreDefecto } from "@/lib/i18n";

type Reporte = Record<ClaveDisciplina, string | null> & {
  id: string;
  folio: number;
  defecto: string | null;
  estado: string;
  creadoEn: string;
  creadoPor: { nombre: string };
};

export function MiniAnillo({ valor, total }: { valor: number; total: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const completo = valor === total;
  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" className="stroke-navy-100" strokeWidth="4" />
        <motion.circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={completo ? "#10B981" : "#3A50A8"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - valor / total) }}
          transition={{ duration: 0.8 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-navy-900">
        {valor}/{total}
      </span>
    </div>
  );
}

export default function Reportes8DCard({
  inspeccionId,
  defectos,
  puedeCrear,
}: {
  inspeccionId: string;
  defectos: { tipo: string; cantidad: number }[];
  puedeCrear: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { t, idioma, locale } = useIdioma();
  const { datos } = usePolling<Reporte[]>(`/api/inspecciones/${inspeccionId}/8d`, 30000);
  const [eligiendo, setEligiendo] = useState(false);
  const [creando, setCreando] = useState(false);

  if (!puedeCrear && datos && datos.length === 0) return null;

  async function crear(defecto: string | null) {
    setCreando(true);
    const res = await fetch(`/api/inspecciones/${inspeccionId}/8d`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defecto }),
    });
    setCreando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? t("No se pudo crear el 8D", "Could not create the 8D"));
      return;
    }
    const nuevo = await res.json();
    toast.exito(t("8D creado con borrador de D1–D3", "8D created with a D1–D3 draft"));
    router.push(`/inspecciones/${inspeccionId}/8d/${nuevo.id}`);
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display font-semibold text-navy-900">{t("Reportes 8D", "8D reports")}</h2>
        {puedeCrear && (
          <button className="btn-primary px-3 py-1.5 text-sm" onClick={() => setEligiendo(true)}>
            + {t("Nuevo 8D", "New 8D")}
          </button>
        )}
      </div>
      {datos === null ? (
        <div className="skeleton h-14 rounded-lg" />
      ) : datos.length === 0 ? (
        <p className="text-sm text-navy-400">
          {t(
            "Sin 8D. Ábrelo cuando un defecto requiera contención y acción correctiva formal.",
            "No 8D yet. Open one when a defect needs formal containment and corrective action."
          )}
        </p>
      ) : (
        <ul className="space-y-2">
          {datos.map((r, i) => (
            <motion.li key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link
                href={`/inspecciones/${inspeccionId}/8d/${r.id}`}
                className="flex items-center gap-3 rounded-xl border border-navy-100 p-3 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <MiniAnillo valor={avance8D(r)} total={DISCIPLINAS.length} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900">
                    8D-{String(r.folio).padStart(4, "0")} · {r.defecto ? nombreDefecto(r.defecto, idioma) : t("General", "General")}
                  </p>
                  <p className="text-xs text-navy-500">
                    {r.creadoPor.nombre} · {new Date(r.creadoEn).toLocaleDateString(locale, { day: "2-digit", month: "short" })}
                  </p>
                </div>
                <span className={`badge ${r.estado === "cerrado" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                  {r.estado === "cerrado" ? t("Cerrado", "Closed") : t("Abierto", "Open")}
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}

      <Modal abierto={eligiendo} onCerrar={() => setEligiendo(false)} ancho="max-w-sm">
        <div className="space-y-3 rounded-xl bg-white p-5 shadow-lg">
          <h2 className="font-display text-lg font-bold text-navy-900">{t("¿Para qué problema?", "For which problem?")}</h2>
          <p className="text-sm text-navy-500">
            {t("Se llena solo un borrador de D1–D3 con los datos de la inspección.", "A D1–D3 draft is pre-filled with the inspection data.")}
          </p>
          <div className="space-y-2">
            {defectos.map((d) => (
              <button
                key={d.tipo}
                disabled={creando}
                onClick={() => crear(d.tipo)}
                className="flex w-full items-center justify-between rounded-lg border border-navy-200 px-3 py-2 text-left text-sm hover:bg-navy-50 disabled:opacity-50"
              >
                <span className="font-medium text-navy-900">{nombreDefecto(d.tipo, idioma)}</span>
                <span className="badge bg-red-50 text-red-700">{d.cantidad} NG</span>
              </button>
            ))}
            <button
              disabled={creando}
              onClick={() => crear(null)}
              className="w-full rounded-lg border border-dashed border-navy-300 px-3 py-2 text-sm font-semibold text-navy-600 hover:bg-navy-50 disabled:opacity-50"
            >
              {t("8D general de la inspección", "General 8D for the inspection")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
