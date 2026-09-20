"use client";

import Image from "next/image";
import type { Rol } from "@prisma/client";
import { usePolling } from "@/lib/usePolling";
import { FRASES_DEL_DIA, FRASES_DEL_DIA_CLIENTE } from "@/lib/constants";
import {
  Kpi,
  SorteosAbiertosCard,
  ResidentesResumenCard,
  type DashboardData,
  type Residente,
} from "./shared";

function fraseDelDia(rol: Rol) {
  const frases = rol === "CLIENTE" ? FRASES_DEL_DIA_CLIENTE : FRASES_DEL_DIA;
  const inicioAno = new Date(new Date().getFullYear(), 0, 0);
  const dia = Math.floor((Date.now() - inicioAno.getTime()) / 86400000);
  return frases[dia % frases.length];
}

export default function DashboardClient({ rol, nombre }: { rol: Rol; nombre: string }) {
  const { datos, cargando } = usePolling<DashboardData>("/api/dashboard", 7000);
  const esOperativo = rol === "ADMIN" || rol === "SUPERVISOR" || rol === "GERENTE" || rol === "LIDER";
  const { datos: residentes } = usePolling<Residente[]>(esOperativo ? "/api/residentes" : null, 20000);

  if (cargando || !datos) {
    return <p className="text-sm text-navy-500">Cargando dashboard…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
        <div className="relative h-72 w-full sm:h-96">
          <Image
            src="/dashboard-hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/40 to-navy-900/5" />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow sm:text-sm">
            Dashboard
          </p>
          <h1 className="font-display text-3xl font-bold text-white drop-shadow sm:text-5xl">
            Bienvenido, {nombre.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
            <span className="font-semibold text-white">Frase del día:</span> {fraseDelDia(rol)}
          </p>
        </div>
      </div>

      {esOperativo ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Kpi etiqueta="Sorteos activos" valor={datos.kpis.inspeccionesActivas} />
            <Kpi etiqueta="Residentes activos" valor={residentes ? residentes.length : "…"} />
          </div>

          <SorteosAbiertosCard rol={rol} sorteosAbiertos={datos.sorteosAbiertos} />

          <ResidentesResumenCard residentes={residentes ?? []} />
        </>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi etiqueta="Inspecciones activas" valor={datos.kpis.inspeccionesActivas} />
          <Kpi etiqueta="Piezas inspeccionadas (mes)" valor={datos.kpis.piezasInspeccionadasMes} />
          <Kpi
            etiqueta="% Rechazo global"
            valor={`${(datos.kpis.porcentajeRechazoGlobal * 100).toFixed(1)}%`}
            alerta={datos.kpis.porcentajeRechazoGlobal >= 0.08}
          />
          <Kpi
            etiqueta="Inspecciones en crítico"
            valor={datos.kpis.inspeccionesEnCritico}
            alerta={datos.kpis.inspeccionesEnCritico > 0}
          />
        </div>
      )}
    </div>
  );
}
