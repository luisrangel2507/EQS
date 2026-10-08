"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Rol } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { NOMBRE_APP } from "@/lib/branding";
import { useIdioma } from "@/components/ui/Idioma";
import type { Traductor } from "@/lib/i18n";

type Paso = { objetivo?: string; titulo: string; texto: string };

const VERSION_TOUR = "v1";
const MARGEN = 8;

function pasosPara(rol: Rol, nombre: string, t: Traductor): Paso[] {
  const primero = nombre.split(" ")[0];
  const bienvenida: Paso = {
    titulo: t(`¡Hola, ${primero}!`, `Hi, ${primero}!`),
    texto: t(
      `Te damos un recorrido de 30 segundos por ${NOMBRE_APP}. Puedes saltarlo y verlo después desde la búsqueda (Ctrl K).`,
      `Here's a 30-second tour of ${NOMBRE_APP}. You can skip it and replay it later from search (Ctrl K).`
    ),
  };
  const buscar: Paso = {
    objetivo: "buscar",
    titulo: t("Busca lo que sea", "Search anything"),
    texto: t(
      "Escribe un número de parte, cliente o acción y llega directo. En computadora también abre con Ctrl K.",
      "Type a part number, customer or action and jump right there. On a computer it also opens with Ctrl K."
    ),
  };
  const perfil: Paso = {
    objetivo: "perfil",
    titulo: t("Tu perfil", "Your profile"),
    texto: t(
      "Aquí cambias el idioma, activas notificaciones, el modo oscuro y cierras sesión.",
      "Change the language, turn on notifications and dark mode, or sign out here."
    ),
  };
  const chat: Paso = {
    objetivo: "chat",
    titulo: t("Chat del equipo", "Team chat"),
    texto: t("Habla con liderazgo y compañeros sin salir de la app.", "Talk to leadership and teammates without leaving the app."),
  };
  const final: Paso = {
    titulo: t("¡Listo!", "All set!"),
    texto: t(
      "Eso es todo. Si algo no queda claro, vuelve a abrir este recorrido desde la búsqueda.",
      "That's it. If anything is unclear, reopen this tour from search."
    ),
  };

  if (rol === "INSPECTOR") {
    return [
      bienvenida,
      {
        objetivo: "nav",
        titulo: t("Tu estación", "Your station"),
        texto: t(
          "En Mis inspecciones está lo que tienes asignado; en Ranking ves cómo vas en el turno.",
          "My inspections has your assignments; Ranking shows how your shift is going."
        ),
      },
      {
        titulo: t("Capturar es rápido", "Logging is fast"),
        texto: t(
          "Registra piezas con los botones grandes. Si te equivocas, toca Deshacer en el aviso. Sin señal, se guarda en el equipo y se envía solo.",
          "Log parts with the big buttons. Made a mistake? Tap Undo on the notice. With no signal it's saved on the device and sent automatically."
        ),
      },
      chat,
      perfil,
      final,
    ];
  }
  if (rol === "CLIENTE") {
    return [
      bienvenida,
      {
        objetivo: "nav",
        titulo: t("Tus inspecciones", "Your inspections"),
        texto: t(
          "Ve en vivo el avance, el Pareto de defectos y las fotos de evidencia de tus piezas. En Solicitudes pides un servicio nuevo.",
          "See live progress, the defect Pareto and evidence photos for your parts. Use Requests to ask for a new service."
        ),
      },
      {
        objetivo: "notificaciones",
        titulo: t("Avisos al momento", "Instant alerts"),
        texto: t("Te avisamos aquí cuando se detecta una pieza NG.", "We'll notify you here as soon as an NG part is found."),
      },
      buscar,
      perfil,
      final,
    ];
  }
  return [
    bienvenida,
    {
      objetivo: "nav",
      titulo: t("Todo el piso aquí", "The whole floor, here"),
      texto: t(
        "Inspecciones, turnos, residentes, ranking y facturación según tu rol.",
        "Inspections, shifts, residents, ranking and billing, depending on your role."
      ),
    },
    ...(rol !== "RESIDENTE"
      ? [
          {
            objetivo: "ejecutivo",
            titulo: t("Dashboard Ejecutivo", "Executive dashboard"),
            texto: t(
              "KPIs del mes, alertas de rechazo y estado de inspectores. Desde ahí abres el Modo TV para la pantalla de piso.",
              "Monthly KPIs, reject alerts and inspector status. Open TV mode for the floor display from there."
            ),
          },
        ]
      : []),
    buscar,
    chat,
    perfil,
    final,
  ];
}

function rectVisible(objetivo?: string) {
  if (!objetivo) return null;
  const candidatos = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${objetivo}"]`));
  for (const el of candidatos) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return r;
  }
  return null;
}

export default function TourBienvenida({ rol, nombre, usuarioId }: { rol: Rol; nombre: string; usuarioId: string }) {
  const [paso, setPaso] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vista, setVista] = useState({ ancho: 0, alto: 0 });
  const { t } = useIdioma();
  const pasos = useMemo(() => pasosPara(rol, nombre, t), [rol, nombre, t]);
  const clave = `ia_tour_${VERSION_TOUR}_${usuarioId}`;
  const inicio = useRef(0);

  const terminar = useCallback(() => {
    setPaso(null);
    try {
      localStorage.setItem(clave, "visto");
    } catch {
      // sin localStorage el tour podría volver a salir; no es grave
    }
  }, [clave]);

  useEffect(() => {
    const iniciar = () => {
      inicio.current = performance.now();
      setPaso(0);
    };
    window.addEventListener("ia-iniciar-tour", iniciar);
    let visto = true;
    try {
      visto = localStorage.getItem(clave) === "visto";
    } catch {
      // sin localStorage no forzamos el tour
    }
    const t = visto ? null : setTimeout(iniciar, 1200);
    return () => {
      window.removeEventListener("ia-iniciar-tour", iniciar);
      if (t) clearTimeout(t);
    };
  }, [clave]);

  const medir = useCallback(() => {
    if (paso === null) return;
    setRect(rectVisible(pasos[paso]?.objetivo));
    setVista({ ancho: window.innerWidth, alto: window.innerHeight });
  }, [paso, pasos]);

  useLayoutEffect(() => {
    medir();
  }, [medir]);

  useEffect(() => {
    if (paso === null) return;
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    const teclas = (e: KeyboardEvent) => {
      // el Enter que abrió el tour desde la paleta no debe avanzarlo
      if (performance.now() - inicio.current < 300) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") terminar();
      if (e.key === "ArrowRight" || e.key === "Enter") setPaso((p) => (p === null ? p : p + 1 >= pasos.length ? null : p + 1));
      if (e.key === "ArrowLeft") setPaso((p) => (p ? p - 1 : p));
    };
    window.addEventListener("keydown", teclas);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("keydown", teclas);
    };
  }, [paso, medir, terminar, pasos.length]);

  useEffect(() => {
    if (paso !== null && paso >= pasos.length) terminar();
  }, [paso, pasos.length, terminar]);

  const actual = paso !== null ? pasos[paso] : null;
  const ultimo = paso === pasos.length - 1;

  const hueco = rect
    ? { top: rect.top - MARGEN, left: rect.left - MARGEN, width: rect.width + MARGEN * 2, height: rect.height + MARGEN * 2 }
    : null;
  const anchoTarjeta = Math.min(340, vista.ancho - 24);
  const abajo = hueco ? hueco.top + hueco.height + 12 + 190 < vista.alto : true;
  const posTarjeta = hueco
    ? {
        top: abajo ? hueco.top + hueco.height + 12 : Math.max(12, hueco.top - 12 - 190),
        left: Math.min(Math.max(12, hueco.left + hueco.width / 2 - anchoTarjeta / 2), vista.ancho - anchoTarjeta - 12),
      }
    : { top: vista.alto / 2 - 110, left: vista.ancho / 2 - anchoTarjeta / 2 };

  return (
    <AnimatePresence>
      {actual && paso !== null && (
        <motion.div
          className="fixed inset-0 z-[90]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-label={t("Recorrido de bienvenida", "Welcome tour")}
        >
          {hueco ? (
            <motion.div
              className="pointer-events-none absolute rounded-xl ring-2 ring-yellow"
              style={{ boxShadow: "0 0 0 9999px rgba(6,14,40,0.72)" }}
              initial={false}
              animate={hueco}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            />
          ) : (
            <div className="absolute inset-0 bg-navy-950/72" style={{ backgroundColor: "rgba(6,14,40,0.72)" }} />
          )}
          <motion.div
            key={paso}
            className="absolute rounded-2xl bg-white p-5 shadow-2xl"
            style={{ width: anchoTarjeta }}
            initial={{ opacity: 0, y: abajo ? -8 : 8, ...posTarjeta }}
            animate={{ opacity: 1, y: 0, ...posTarjeta }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
              {paso + 1} de {pasos.length}
            </p>
            <h3 className="mt-1 font-display text-lg font-bold text-navy-900">{actual.titulo}</h3>
            <p className="mt-1 text-sm text-navy-600">{actual.texto}</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {pasos.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === paso ? "w-5 bg-navy" : "w-1.5 bg-navy-200"}`} />
                ))}
              </div>
              {!ultimo && (
                <button className="px-2 text-xs font-semibold text-navy-400 hover:text-navy-700" onClick={terminar}>
                  {t("Saltar", "Skip")}
                </button>
              )}
              {paso > 0 && (
                <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setPaso(paso - 1)}>
                  {t("Atrás", "Back")}
                </button>
              )}
              <button className="btn-accent px-3 py-1.5 text-sm" onClick={() => (ultimo ? terminar() : setPaso(paso + 1))}>
                {ultimo ? t("¡Empezar!", "Let’s go!") : t("Siguiente", "Next")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
