"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { useOrganizacion } from "@/components/Organizacion";

export default function EtiquetaClient({
  id,
  nombre,
  numeroParte,
  cliente,
  planta,
  puntoLimpio,
}: {
  id: string;
  nombre: string;
  numeroParte: string | null;
  cliente: string | null;
  planta: string | null;
  puntoLimpio: string | null;
}) {
  const organizacion = useOrganizacion();
  const [qr, setQr] = useState<string | null>(null);
  const [copias, setCopias] = useState(1);

  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/inspecciones/${id}`, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0A163C", light: "#FFFFFF" },
    }).then(setQr);
  }, [id]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link href={`/inspecciones/${id}`} className="text-xs font-semibold text-navy-400 hover:text-navy-700">
            ← {nombre}
          </Link>
          <h1 className="font-display text-2xl font-bold text-navy-900">Etiqueta QR</h1>
          <p className="text-sm text-navy-500">
            Pégala en el contenedor o la estación: el inspector la escanea y entra directo a capturar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-navy-600">Copias</label>
          <input
            type="number"
            min={1}
            max={24}
            value={copias}
            onChange={(e) => setCopias(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
            className="input w-20"
          />
          <button className="btn-accent" onClick={() => window.print()} disabled={!qr}>
            Imprimir
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
        {Array.from({ length: copias }).map((_, i) => (
          <div
            key={i}
            className="flex break-inside-avoid items-center gap-4 rounded-xl border-2 border-dashed border-navy-300 bg-white p-4 text-navy-900"
          >
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Código QR de la inspección" className="h-36 w-36 shrink-0" />
            ) : (
              <div className="skeleton h-36 w-36 shrink-0 rounded-lg" />
            )}
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-navy-500">{organizacion.nombreCorto}</p>
              <p className="font-display text-2xl font-extrabold leading-tight">{numeroParte ?? nombre}</p>
              <p className="truncate text-sm">{nombre}</p>
              {cliente && <p className="text-xs">Cliente: {cliente}</p>}
              {planta && <p className="text-xs">Planta: {planta}</p>}
              {puntoLimpio && <p className="text-xs">Lote: {puntoLimpio}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
