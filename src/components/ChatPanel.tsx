"use client";

import { useEffect, useRef, useState } from "react";
import { usePolling } from "@/lib/usePolling";
import { ROL_ETIQUETAS } from "@/lib/constants";

type Mensaje = {
  id: string;
  contenido: string;
  creadoEn: string;
  autor: { id: string; nombre: string; rol: string };
};

export default function ChatPanel({
  miId,
  abierto,
  onCerrar,
}: {
  miId: string;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const { datos: mensajes, cargando, recargar } = usePolling<Mensaje[]>(
    abierto ? "/api/chat" : null,
    3000
  );
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const primerCarga = useRef(true);

  useEffect(() => {
    if (!mensajes || !abierto) return;
    finRef.current?.scrollIntoView({ behavior: primerCarga.current ? "auto" : "smooth" });
    primerCarga.current = false;
  }, [mensajes, abierto]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido) return;
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo enviar el mensaje");
      return;
    }
    setTexto("");
    recargar();
  }

  function manejarTecla(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar(e as unknown as React.FormEvent);
    }
  }

  return (
    <>
      <div
        onClick={onCerrar}
        className={`fixed inset-0 z-40 bg-navy-900/40 transition-opacity ${
          abierto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${
          abierto ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-hidden={!abierto}
      >
        <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
          <h2 className="font-display font-semibold text-navy-900">💬 Chat de liderazgo</h2>
          <button
            onClick={onCerrar}
            className="rounded-md p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700"
            aria-label="Cerrar chat"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-4">
          {cargando ? (
            <p className="text-sm text-navy-400">Cargando…</p>
          ) : mensajes && mensajes.length > 0 ? (
            <div className="flex flex-col gap-3">
              {mensajes.map((m) => {
                const esMio = m.autor.id === miId;
                return (
                  <div key={m.id} className={`flex ${esMio ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 ${
                        esMio ? "bg-navy text-white" : "bg-navy-50 text-navy-900"
                      }`}
                    >
                      <p
                        className={`mb-0.5 text-xs font-semibold ${
                          esMio ? "text-white/80" : "text-navy-500"
                        }`}
                      >
                        {m.autor.nombre} · {ROL_ETIQUETAS[m.autor.rol] ?? m.autor.rol}
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{m.contenido}</p>
                      <p className={`mt-1 text-[10px] ${esMio ? "text-white/60" : "text-navy-400"}`}>
                        {new Date(m.creadoEn).toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={finRef} />
            </div>
          ) : (
            <p className="text-sm text-navy-400">
              Todavía no hay mensajes. Sé el primero en escribir.
            </p>
          )}
        </div>

        <form onSubmit={enviar} className="flex items-end gap-2 border-t border-navy-100 p-3">
          <textarea
            className="input flex-1 resize-none"
            rows={2}
            placeholder="Escribe un mensaje…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={manejarTecla}
            maxLength={2000}
          />
          <button type="submit" className="btn-primary" disabled={enviando || !texto.trim()}>
            Enviar
          </button>
        </form>
        {error && <p className="px-3 pb-2 text-sm text-red-600">{error}</p>}
      </div>
    </>
  );
}
