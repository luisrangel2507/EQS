"use client";

import { useRef, useState } from "react";

export default function SubidaPdf({
  url,
  onCambiar,
}: {
  url: string;
  onCambiar: (url: string) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError(null);
    setSubiendo(true);
    const form = new FormData();
    form.append("archivo", archivo);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    setSubiendo(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo subir el archivo");
      return;
    }
    const d = await res.json();
    onCambiar(d.url);
  }

  function quitar() {
    onCambiar("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      {url ? (
        <div className="flex items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2 text-sm">
          <a href={url} target="_blank" rel="noreferrer" className="font-medium text-navy underline">
            Ver PDF cargado
          </a>
          <button type="button" onClick={quitar} className="ml-auto text-xs text-navy-400 hover:text-red-600">
            Quitar
          </button>
        </div>
      ) : (
        <input
          ref={inputRef}
          className="input"
          type="file"
          accept="application/pdf"
          onChange={manejarArchivo}
          disabled={subiendo}
        />
      )}
      {subiendo && <p className="mt-1 text-xs text-navy-400">Subiendo…</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
