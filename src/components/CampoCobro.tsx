"use client";

export default function CampoCobro({
  modo,
  onModo,
  precioPieza,
  onPrecioPieza,
  precioHora,
  onPrecioHora,
}: {
  modo: string;
  onModo: (m: "pieza" | "hora") => void;
  precioPieza: string;
  onPrecioPieza: (v: string) => void;
  precioHora: string;
  onPrecioHora: (v: string) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <label className="label">Cobro (facturación)</label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-navy-200 bg-white p-0.5">
          {(["pieza", "hora"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModo(m)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                modo === m ? "bg-navy text-white" : "text-navy-600"
              }`}
            >
              {m === "pieza" ? "Por pieza" : "Por hora"}
            </button>
          ))}
        </div>
        <div className="relative w-40">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-navy-400">$</span>
          <input
            className="input pl-6 pr-14"
            type="number"
            min={0}
            step="0.01"
            value={modo === "hora" ? precioHora : precioPieza}
            onChange={(e) => (modo === "hora" ? onPrecioHora : onPrecioPieza)(e.target.value)}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-navy-400">
            {modo === "hora" ? "/hora" : "/pieza"}
          </span>
        </div>
      </div>
      {modo === "hora" && (
        <p className="mt-1 text-xs text-navy-400">Se cobran las horas que los inspectores registran en esta inspección.</p>
      )}
    </div>
  );
}
