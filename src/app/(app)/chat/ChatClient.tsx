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

export default function ChatClient({ miId }: { miId: string }) {
  const { datos: mensajes, cargando, recargar } = usePolling<Mensaje[]>("/api/chat", 3000);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const primerCarga = useRef(true);

  useEffect(() => {
    if (!mensajes) return;
    finRef.current?.scrollIntoView({ behavior: primerCarga.current ? "auto" : "smooth" });
    primerCarga.current = false;
  }, [mensajes]);

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
    <div className="flex h-[calc(100dvh-140px)] flex-col">
      <h1 className="mb-3 font-display text-2xl font-bold text-navy-900">
        Chat de liderazgo
      </h1>

      <div className="flex flex-1 flex-col overflow-y-auto rounded-xl border border-navy-100 bg-white p-4">
        {cargando ? (
          <p className="text-sm text-navy-400">Cargando…</p>
        ) : mensajes && mensajes.length > 0 ? (
          <div className="flex flex-col gap-3">
            {mensajes.map((m) => {
              const esMio = m.autor.id === miId;
              return (
                <div key={m.id} className={`flex ${esMio ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 ${
                      esMio ? "bg-navy text-white" : "bg-navy-50 text-navy-900"
                    }`}
                  >
                    {!esMio && (
                      <p className="mb-0.5 text-xs font-semibold text-navy-500">
                        {m.autor.nombre} · {ROL_ETIQUETAS[m.autor.rol] ?? m.autor.rol}
                      </p>
                    )}
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

      <form onSubmit={enviar} className="mt-3 flex items-end gap-2">
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
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
