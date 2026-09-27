export type TipoFeedback = "exito" | "error" | "toque";

const PATRONES: Record<TipoFeedback, number | number[]> = {
  toque: 12,
  exito: 35,
  error: [60, 40, 60],
};

export function vibrar(tipo: TipoFeedback) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(PATRONES[tipo]);
  } catch {
    // algunos navegadores lanzan si no hubo gesto del usuario; no es crítico
  }
}

export function flashPantalla(tipo: "exito" | "error") {
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const el = document.createElement("div");
  el.className = `flash-pantalla ${tipo === "exito" ? "flash-exito" : "flash-error"}`;
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}
