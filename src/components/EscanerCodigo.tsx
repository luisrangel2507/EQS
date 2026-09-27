"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Modal from "@/components/ui/Modal";
import { vibrar } from "@/lib/feedback";

type Opcion = { id: string; nombre: string; numeroParte: string | null; cliente: string | null; cerrado: boolean };

export default function EscanerCodigo({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} ancho="max-w-md">
      {abierto && <ContenidoEscaner onCerrar={onCerrar} />}
    </Modal>
  );
}

function ContenidoEscaner({ onCerrar }: { onCerrar: () => void }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [opciones, setOpciones] = useState<Opcion[] | null>(null);
  const ultimoLeido = useRef<string | null>(null);

  async function resolver(codigo: string) {
    const limpio = codigo.trim();
    if (!limpio || buscando) return;
    setBuscando(true);
    setMensaje(null);
    setOpciones(null);
    const res = await fetch(`/api/inspecciones/buscar?codigo=${encodeURIComponent(limpio)}`).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBuscando(false);
    if (!res?.ok) {
      vibrar("error");
      setMensaje(d?.error ?? "Sin conexión para buscar el código");
      ultimoLeido.current = null;
      return;
    }
    vibrar("exito");
    if (d.id) {
      onCerrar();
      router.push(`/inspecciones/${d.id}`);
    } else {
      setOpciones(d.opciones);
    }
  }

  const resolverRef = useRef(resolver);
  resolverRef.current = resolver;

  useEffect(() => {
    let detener: (() => void) | null = null;
    let cancelado = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelado || !videoRef.current) return;
        const lector = new BrowserMultiFormatReader();
        const controles = await lector.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current,
          (resultado) => {
            const texto = resultado?.getText();
            if (!texto || texto === ultimoLeido.current) return;
            ultimoLeido.current = texto;
            resolverRef.current(texto);
          }
        );
        if (cancelado) controles.stop();
        else detener = () => controles.stop();
      } catch {
        setErrorCamara("No se pudo abrir la cámara. Da permiso o escribe el código abajo.");
      }
    })();

    return () => {
      cancelado = true;
      detener?.();
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
        <h2 className="font-display font-semibold text-navy-900">📷 Escanear pieza</h2>
        <button onClick={onCerrar} className="rounded-md p-1 text-navy-400 hover:bg-navy-50" aria-label="Cerrar">
          ✕
        </button>
      </div>

      <div className="relative aspect-square bg-navy-950">
        {errorCamara ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/80">
            {errorCamara}
          </div>
        ) : (
          <>
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-yellow/80 shadow-[0_0_0_9999px_rgba(6,14,40,0.45)]">
              <motion.div
                className="absolute inset-x-3 h-0.5 rounded-full bg-yellow shadow-[0_0_12px_rgba(244,217,53,0.9)]"
                animate={{ top: ["8%", "92%", "8%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <p className="absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-white/80">
              Apunta al QR de la etiqueta o al código de barras
            </p>
          </>
        )}
        {buscando && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy-950/60 text-sm font-semibold text-white">
            Buscando…
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        {mensaje && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{mensaje}</p>}

        {opciones && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
              Hay varias inspecciones con ese código
            </p>
            {opciones.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onCerrar();
                  router.push(`/inspecciones/${o.id}`);
                }}
                className="flex w-full items-center justify-between rounded-lg border border-navy-200 px-3 py-2 text-left text-sm hover:bg-navy-50"
              >
                <span>
                  <span className="block font-semibold text-navy-900">{o.nombre}</span>
                  <span className="text-xs text-navy-500">
                    {o.numeroParte}
                    {o.cliente ? ` · ${o.cliente}` : ""}
                  </span>
                </span>
                <span className={`badge ${o.cerrado ? "bg-navy-100 text-navy-500" : "bg-green-100 text-green-800"}`}>
                  {o.cerrado ? "Cerrada" : "Activa"}
                </span>
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            resolver(manual);
          }}
          className="flex gap-2"
        >
          <input
            className="input flex-1"
            placeholder="O escribe el número de parte / lote"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            autoCapitalize="characters"
          />
          <button type="submit" className="btn-primary" disabled={buscando || !manual.trim()}>
            Buscar
          </button>
        </form>
      </div>
    </div>
  );
}
