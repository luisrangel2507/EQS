"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { DatosPublicos } from "@/lib/compartido";
import { NOMBRE_EMPRESA } from "@/lib/branding";
import NumeroAnimado from "@/components/ui/NumeroAnimado";
import GaleriaDefectos from "@/components/GaleriaDefectos";
import { BotonIdioma, useIdioma } from "@/components/ui/Idioma";
import { nombreDefecto, type Traductor } from "@/lib/i18n";

function haceCuanto(fecha: string | null, t: Traductor) {
  if (!fecha) return t("sin actividad", "no activity");
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (min < 1) return t("hace un momento", "just now");
  if (min < 60) return t(`hace ${min} min`, `${min} min ago`);
  const h = Math.floor(min / 60);
  return h < 24 ? t(`hace ${h} h`, `${h} h ago`) : t(`hace ${Math.floor(h / 24)} d`, `${Math.floor(h / 24)} d ago`);
}

function Anillo({ porcentaje, etiqueta }: { porcentaje: number; etiqueta: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#grad-anillo)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{
            strokeDashoffset: c * (1 - Math.min(porcentaje, 100) / 100),
          }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
        <defs>
          <linearGradient id="grad-anillo" x1="0" x2="1">
            <stop offset="0%" stopColor="#F4D935" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-extrabold text-white">
          <NumeroAnimado valor={porcentaje} formato={(n) => `${n.toFixed(0)}%`} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{etiqueta}</span>
      </div>
    </div>
  );
}

export default function PortalPublicoClient({ token, inicial }: { token: string; inicial: DatosPublicos }) {
  const { t, idioma, locale } = useIdioma();
  const [datos, setDatos] = useState(inicial);
  const [valido, setValido] = useState(true);

  useEffect(() => {
    const intervalo = setInterval(async () => {
      const res = await fetch(`/api/publico/${token}`).catch(() => null);
      if (!res) return;
      if (res.status === 404) {
        setValido(false);
        return;
      }
      if (res.ok) setDatos(await res.json());
    }, 15000);
    return () => clearInterval(intervalo);
  }, [token]);

  const total = datos.piezasBuenas + datos.piezasMalas;
  const rechazo = total > 0 ? (datos.piezasMalas / total) * 100 : 0;
  const calidad = 100 - rechazo;
  const avance = datos.meta > 0 ? (total / datos.meta) * 100 : calidad;
  const maxDefecto = Math.max(1, ...datos.defectos.map((d) => d.cantidad));

  if (!valido) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-950 p-6 text-center text-white">
        <div>
          <h1 className="mt-3 font-display text-2xl font-bold">{t("Este enlace fue revocado", "This link was revoked")}</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="relative overflow-hidden bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-5 pb-10 pt-6">
          <div className="flex items-center justify-between">
            <Image src="/logo-header.png" alt={NOMBRE_EMPRESA} width={1200} height={304} className="h-10 w-auto" priority />
            <div className="flex items-center gap-3">
              <BotonIdioma oscuro />
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                <span className="relative flex h-2 w-2">
                  {!datos.cerrado && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {datos.cerrado ? t("Cerrada", "Closed") : t("En vivo", "Live")}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-yellow">
                {datos.cliente ?? t("Avance de inspección", "Inspection progress")}
              </p>
              <h1 className="mt-1 font-display text-4xl font-extrabold">{datos.numeroParte ?? datos.nombre}</h1>
              <p className="mt-1 text-white/70">
                {datos.nombre}
                {datos.planta ? ` · ${datos.planta}` : ""}
              </p>
              <p className="mt-3 text-sm text-white/60">
                {t("Última captura", "Last entry")} {haceCuanto(datos.ultimaActividad, t)}
                {datos.fechaEntrega
                  ? ` · ${t("Entrega", "Due")} ${new Date(datos.fechaEntrega).toLocaleDateString(locale, { day: "2-digit", month: "short" })}`
                  : ""}
              </p>
            </motion.div>
            <Anillo
              porcentaje={avance}
              etiqueta={datos.meta > 0 ? t(`de ${datos.meta} pzas`, `of ${datos.meta} pcs`) : t("calidad", "quality")}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-6 max-w-5xl space-y-6 px-5 pb-16">
        <div className={`grid grid-cols-2 gap-3 ${datos.piezasRetrabajadas > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
          {[
            {
              etiqueta: t("Inspeccionadas", "Inspected"),
              valor: total,
              color: "text-navy-900",
            },
            {
              etiqueta: t("Buenas", "Good"),
              valor: datos.piezasBuenas,
              color: "text-emerald-600",
            },
            {
              etiqueta: t("Rechazadas", "Rejected"),
              valor: datos.piezasMalas,
              color: "text-red-600",
            },
            {
              etiqueta: t("% Rechazo", "% Reject"),
              valor: rechazo,
              color: rechazo >= 8 ? "text-red-600" : "text-navy-900",
              pct: true,
            },
            ...(datos.piezasRetrabajadas > 0
              ? [
                  {
                    etiqueta: `${t("Recuperadas", "Reworked OK")}`,
                    valor: datos.piezasRetrabajadas,
                    color: "text-amber-600",
                  },
                ]
              : []),
          ].map((k, i) => (
            <motion.div
              key={k.etiqueta}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className="card p-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-500">{k.etiqueta}</p>
              <p className={`mt-1 font-display text-3xl font-extrabold ${k.color}`}>
                <NumeroAnimado valor={k.valor} formato={k.pct ? (n) => `${n.toFixed(1)}%` : undefined} />
              </p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="card md:col-span-2">
            <h2 className="mb-4 font-display font-semibold text-navy-900">{t("Pareto de defectos", "Defect Pareto")}</h2>
            {datos.defectos.length === 0 ? (
              <p className="text-sm text-navy-400">{t("Sin defectos detectados.", "No defects found.")}</p>
            ) : (
              <ul className="space-y-3">
                {datos.defectos.slice(0, 8).map((d, i) => (
                  <li key={d.tipo}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-navy-800">{nombreDefecto(d.tipo, idioma)}</span>
                      <span className="font-semibold text-navy-900">{d.cantidad}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-navy-50">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-navy-500 to-navy-800"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(d.cantidad / maxDefecto) * 100}%`,
                        }}
                        transition={{
                          delay: 0.2 + i * 0.06,
                          duration: 0.8,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 font-display font-semibold text-navy-900">{t("Punto Limpio", "Clean Point")}</h2>
            <p className="font-display text-xl font-bold text-navy-900">
              {datos.puntoLimpio ?? t("Sin identificar", "Not identified")}
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                datos.puntoLimpioOk ? "text-emerald-600" : datos.puntoLimpioFoto ? "text-amber-600" : "text-navy-400"
              }`}
            >
              {datos.puntoLimpioOk
                ? `${t("Verificado", "Verified")}`
                : datos.puntoLimpioFoto
                  ? `${t("Evidencia enviada", "Evidence sent")}`
                  : `— ${t("Pendiente", "Pending")}`}
            </p>
            {datos.puntoLimpioFoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={datos.puntoLimpioFoto}
                alt={t("Evidencia de Punto Limpio", "Clean Point evidence")}
                className="mt-3 w-full rounded-lg object-cover"
              />
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 font-display font-semibold text-navy-900">{t("Evidencia de defectos", "Defect evidence")}</h2>
          <GaleriaDefectos fotos={datos.fotos} vacio={t("No hay fotos de defectos registradas.", "No defect photos recorded.")} />
        </div>

        <p className="text-center text-xs text-navy-400">
          {datos.organizacion.nombre} ·{" "}
          {t("Vista de solo lectura, se actualiza sola cada 15 segundos", "Read-only view, refreshes every 15 seconds")}
        </p>
      </div>
    </main>
  );
}
