"use client";

import { motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import { Skeleton } from "@/components/ui/Skeleton";
import Icono from "@/components/ui/Icono";

type Datos = {
  ok: boolean;
  version: string;
  rutaFotos: string;
  chequeos: Record<string, { ok: boolean; detalle: string }>;
};

const NOMBRES: Record<string, string> = {
  baseDeDatos: "Base de datos",
  migraciones: "Migraciones",
  escrituraFotos: "Guardar fotos",
  espacio: "Espacio de almacenamiento",
  fotosGuardadas: "Fotos guardadas",
};

export default function SaludClient() {
  const { datos, recargar } = usePolling<Datos>("/api/salud", 30000);

  if (!datos) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Estado del sistema</h1>
          <p className="text-sm text-navy-500">Versión {datos.version} · fotos en {datos.rutaFotos}</p>
        </div>
        <button className="btn-secondary" onClick={recargar}>
          Volver a revisar
        </button>
      </div>

      <div
        className={`rounded-2xl px-5 py-4 font-display text-lg font-bold ${
          datos.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}
      >
        {datos.ok ? "Todo en orden" : "Hay algo que revisar"}
      </div>

      <ul className="space-y-2">
        {Object.entries(datos.chequeos).map(([clave, c], i) => (
          <motion.li
            key={clave}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card flex items-start gap-3 p-4"
          >
            <Icono nombre={c.ok ? "check" : "alerta"} className={`mt-0.5 h-5 w-5 shrink-0 ${c.ok ? "text-emerald-600" : "text-red-600"}`} />
            <div className="min-w-0">
              <p className="font-semibold text-navy-900">{NOMBRES[clave] ?? clave}</p>
              <p className="break-words text-sm text-navy-600">{c.detalle}</p>
            </div>
          </motion.li>
        ))}
      </ul>

      {!datos.chequeos.escrituraFotos?.ok || !datos.chequeos.espacio?.ok ? (
        <div className="card space-y-2 text-sm text-navy-700">
          <p className="font-semibold text-navy-900">Cómo arreglarlo en Railway</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>Abre el servicio web → pestaña <strong>Volumes</strong>.</li>
            <li>
              El volume debe estar montado exactamente en <code className="rounded bg-navy-50 px-1">{datos.rutaFotos}</code>.
            </li>
            <li>Si dice que está lleno, aumenta su tamaño desde la misma pestaña.</li>
            <li>Vuelve a esta página y presiona &ldquo;Volver a revisar&rdquo;.</li>
          </ol>
        </div>
      ) : null}
    </div>
  );
}
