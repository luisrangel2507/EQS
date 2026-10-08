"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Skeleton, SkeletonKpis, SkeletonTarjetas } from "@/components/ui/Skeleton";
import type { Rol } from "@prisma/client";
import { usePolling } from "@/lib/usePolling";
import { FRASES_DEL_DIA, FRASES_DEL_DIA_CLIENTE, FRASES_DEL_DIA_CLIENTE_EN } from "@/lib/constants";
import { useIdioma } from "@/components/ui/Idioma";
import type { Idioma } from "@/lib/i18n";
import {
  Kpi,
  SorteosAbiertosCard,
  ResidentesResumenCard,
  MiEstadoResidenteCard,
  type DashboardData,
  type Residente,
} from "./shared";

function fraseDelDia(rol: Rol, idioma: Idioma) {
  // las frases de piso quedan en español: el equipo operativo es de planta en México
  const frases = rol === "CLIENTE" ? (idioma === "en" ? FRASES_DEL_DIA_CLIENTE_EN : FRASES_DEL_DIA_CLIENTE) : FRASES_DEL_DIA;
  const inicioAno = new Date(new Date().getFullYear(), 0, 0);
  const dia = Math.floor((Date.now() - inicioAno.getTime()) / 86400000);
  return frases[dia % frases.length];
}

export default function DashboardClient({ rol, nombre }: { rol: Rol; nombre: string }) {
  const { t, idioma } = useIdioma();
  const { datos, cargando } = usePolling<DashboardData>("/api/dashboard", 7000);
  const esOperativo = rol === "ADMIN" || rol === "SUPERVISOR" || rol === "GERENTE" || rol === "LIDER";
  const { datos: residentes } = usePolling<Residente[]>(esOperativo ? "/api/residentes" : null, 20000);

  if (cargando || !datos) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-72 w-full sm:h-96" />
        <SkeletonKpis cantidad={2} />
        <SkeletonTarjetas />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
        <div className="relative h-56 w-full bg-[radial-gradient(ellipse_at_top_right,_#233581_0%,_#0A163C_55%,_#060E28_100%)] sm:h-72">
          <Image
            src="/logo-header.png"
            alt=""
            width={1200}
            height={304}
            priority
            className="absolute right-4 top-6 h-auto w-44 opacity-25 sm:right-10 sm:top-8 sm:w-80"
          />
        </div>
        <motion.div
          className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow sm:text-sm">
            Dashboard
          </p>
          <h1 className="font-display text-3xl font-bold text-white drop-shadow sm:text-5xl">
            {t("Bienvenido", "Welcome")}, {nombre.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
            <span className="font-semibold text-white">{t("Frase del día:", "Today's thought:")}</span> {fraseDelDia(rol, idioma)}
          </p>
        </motion.div>
      </div>

      {esOperativo ? (
        <div className="relative left-1/2 w-screen -translate-x-1/2">
          <div className="mx-auto max-w-[1800px] space-y-6 px-4 sm:px-8">
            <div className="grid grid-cols-2 gap-4">
              <Kpi etiqueta={t("Sorteos activos", "Active sorts")} valor={datos.kpis.inspeccionesActivas} />
              <Kpi etiqueta={t("Residentes activos", "Active residents")} valor={residentes ? residentes.length : "…"} indice={1} />
            </div>

            <SorteosAbiertosCard rol={rol} sorteosAbiertos={datos.sorteosAbiertos} />

            <ResidentesResumenCard residentes={residentes ?? []} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {rol === "RESIDENTE" && <MiEstadoResidenteCard />}
          {rol === "CLIENTE" && (
            <Link
              href="/solicitudes?nueva=1"
              className="group flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-yellow to-amber-400 p-5 text-navy-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div>
                <p className="font-display text-xl font-extrabold">{t("¿Necesitas un sorteo o retrabajo?", "Need a sort or rework?")}</p>
                <p className="text-sm font-medium text-navy-800/80">
                  {t(
                    "Levanta tu solicitud aquí y síguela en vivo, sin llamadas ni correos.",
                    "Submit your request here and track it live, no calls or emails."
                  )}
                </p>
              </div>
              <span className="rounded-xl bg-navy px-4 py-2 font-semibold text-white transition group-hover:scale-105">
                {t("Solicitar servicio", "Request service")}
              </span>
            </Link>
          )}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi etiqueta={t("Inspecciones activas", "Active inspections")} valor={datos.kpis.inspeccionesActivas} />
            <Kpi etiqueta={t("Piezas inspeccionadas (mes)", "Parts inspected (month)")} valor={datos.kpis.piezasInspeccionadasMes} indice={1} />
            <Kpi
              etiqueta={t("% Rechazo global", "Overall reject %")}
              valor={datos.kpis.porcentajeRechazoGlobal * 100}
              formato={(n) => `${n.toFixed(1)}%`}
              alerta={datos.kpis.porcentajeRechazoGlobal >= 0.08}
              indice={2}
            />
            <Kpi
              etiqueta={t("Inspecciones en crítico", "Critical inspections")}
              valor={datos.kpis.inspeccionesEnCritico}
              alerta={datos.kpis.inspeccionesEnCritico > 0}
              indice={3}
            />
          </div>
        </div>
      )}
    </div>
  );
}
