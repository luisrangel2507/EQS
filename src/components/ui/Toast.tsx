"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type TipoToast = "exito" | "error" | "info";

type Toast = {
  id: number;
  tipo: TipoToast;
  mensaje: string;
  accion?: { etiqueta: string; onClick: () => void };
  duracion: number;
};

type OpcionesToast = { accion?: Toast["accion"]; duracion?: number };

type ApiToast = {
  exito: (mensaje: string, opciones?: OpcionesToast) => void;
  error: (mensaje: string, opciones?: OpcionesToast) => void;
  info: (mensaje: string, opciones?: OpcionesToast) => void;
};

const ToastContext = createContext<ApiToast>({ exito: () => {}, error: () => {}, info: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ESTILOS: Record<TipoToast, { icono: string; clase: string; barra: string }> = {
  exito: { icono: "✅", clase: "border-emerald-200 bg-white", barra: "bg-emerald-500" },
  error: { icono: "⚠️", clase: "border-red-200 bg-white", barra: "bg-red-500" },
  info: { icono: "ℹ️", clase: "border-navy-200 bg-white", barra: "bg-navy-500" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const siguienteId = useRef(1);

  const quitar = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const agregar = useCallback(
    (tipo: TipoToast, mensaje: string, opciones?: OpcionesToast) => {
      const id = siguienteId.current++;
      const duracion = opciones?.duracion ?? (tipo === "error" ? 5000 : 3000);
      setToasts((prev) => [...prev.slice(-3), { id, tipo, mensaje, accion: opciones?.accion, duracion }]);
      setTimeout(() => quitar(id), duracion);
    },
    [quitar]
  );

  const api = useRef<ApiToast>({
    exito: (m, o) => agregar("exito", m, o),
    error: (m, o) => agregar("error", m, o),
    info: (m, o) => agregar("info", m, o),
  });

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-24 sm:items-end">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const estilo = ESTILOS[t.tipo];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border shadow-lg ${estilo.clase}`}
                role="status"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg">{estilo.icono}</span>
                  <p className="flex-1 text-sm font-medium text-navy-900">{t.mensaje}</p>
                  {t.accion && (
                    <button
                      type="button"
                      onClick={() => {
                        t.accion?.onClick();
                        quitar(t.id);
                      }}
                      className="rounded-md bg-navy px-2.5 py-1 text-xs font-bold text-white hover:bg-navy-600"
                    >
                      {t.accion.etiqueta}
                    </button>
                  )}
                </div>
                <motion.div
                  className={`absolute bottom-0 left-0 h-0.5 ${estilo.barra}`}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: t.duracion / 1000, ease: "linear" }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
