"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BotonIdioma, useIdioma } from "@/components/ui/Idioma";
import type { Traductor } from "@/lib/i18n";
import { CONTACTO_EMAIL, CONTACTO_WHATSAPP, NOMBRE_APP, NOMBRE_CORTO, NOMBRE_EMPRESA, NOMBRE_LEGAL } from "@/lib/branding";

const urlDemo = (t: Traductor) =>
  CONTACTO_WHATSAPP
    ? `https://wa.me/${CONTACTO_WHATSAPP}?text=${encodeURIComponent(
        t(`Hola, me interesa una demo de ${NOMBRE_APP}.`, `Hi, I'm interested in a demo of ${NOMBRE_APP}.`)
      )}`
    : CONTACTO_EMAIL
      ? `mailto:${CONTACTO_EMAIL}?subject=${encodeURIComponent(t(`Demo de ${NOMBRE_APP}`, `${NOMBRE_APP} demo`))}`
      : null;

type Texto = [es: string, en: string];

const MODULOS: { titulo: Texto; texto: Texto }[] = [
  {
    titulo: ["Captura en piso", "Shop-floor capture"],
    texto: [
      "Botones grandes, vibración y deshacer. Hecha para usarse con guantes y prisa.",
      "Big buttons, haptics and undo. Built to be used with gloves, in a hurry.",
    ],
  },
  {
    titulo: ["Funciona sin señal", "Works offline"],
    texto: [
      "Las capturas y fotos se guardan en el equipo y se sincronizan solas al volver la red.",
      "Counts and photos are stored on the device and sync automatically when the network is back.",
    ],
  },
  {
    titulo: ["Material liberado con QR", "Released-material QR labels"],
    texto: [
      "Etiqueta por contenedor con QR público: cualquiera en la cadena verifica qué se inspeccionó.",
      "One label per container with a public QR: anyone down the supply chain can verify what was inspected.",
    ],
  },
  {
    titulo: ["Modo TV Andon", "Andon TV mode"],
    texto: [
      "Pantalla de piso con semáforo por sorteo, llamados de apoyo y alertas en vivo.",
      "A floor display with a traffic light per sort, help calls and live alerts.",
    ],
  },
  {
    titulo: ["Control estadístico", "Statistical control"],
    texto: [
      "Gráfica p por hora con límites de control y fecha estimada de término.",
      "Hourly p-chart with control limits and an estimated completion date.",
    ],
  },
  {
    titulo: ["Portal del cliente", "Customer portal"],
    texto: [
      "Avance en vivo, Pareto, fotos, solicitudes de servicio y auditorías. En español o inglés.",
      "Live progress, Pareto, photos, service requests and audits. In English or Spanish.",
    ],
  },
  {
    titulo: ["Reportes 8D", "8D reports"],
    texto: [
      "Se llenan solos con los datos del sorteo y salen en PDF listo para el cliente.",
      "Pre-filled with the sort data and exported as a customer-ready PDF.",
    ],
  },
  {
    titulo: ["Auditorías y checklists", "Audits & checklists"],
    texto: [
      "LPA, 5S y recibo con fotos de hallazgos, % de cumplimiento y PDF.",
      "LPA, 5S and receiving audits with finding photos, compliance score and PDF.",
    ],
  },
  {
    titulo: ["Inspectores certificados", "Certified inspectors"],
    texto: [
      "Examen por número de parte: solo quien aprobó puede ser asignado a ese sorteo.",
      "A per-part-number exam: only certified inspectors can be assigned to that sort.",
    ],
  },
  {
    titulo: ["Facturación por pieza u hora", "Billing per piece or hour"],
    texto: [
      "Estado de cuenta mensual por cliente, con asistencia de inspectores integrada.",
      "Monthly statement per customer, with inspector attendance built in.",
    ],
  },
  {
    titulo: ["Turnos y relevos", "Shifts & handovers"],
    texto: [
      "Bitácora de entrega de turno con los números del turno guardados solos.",
      "A shift handover log with the shift's numbers captured automatically.",
    ],
  },
  {
    titulo: ["Ranking de inspectores", "Inspector leaderboard"],
    texto: [
      "Metas, rachas e insignias que premian productividad y detección.",
      "Goals, streaks and badges that reward throughput and detection.",
    ],
  },
];

const ROLES: { clave: string; titulo: Texto; puntos: Texto[] }[] = [
  {
    clave: "inspector",
    titulo: ["Inspector", "Inspector"],
    puntos: [
      ["Ve sus sorteos asignados al entrar", "Sees their assigned sorts on sign-in"],
      ["Registra piezas en dos toques", "Logs parts in two taps"],
      ["Pide apoyo con un botón", "Calls for help with one button"],
      ["Ve su ritmo y su lugar en el ranking", "Sees their pace and leaderboard spot"],
    ],
  },
  {
    clave: "liderazgo",
    titulo: ["Supervisor / Gerente", "Supervisor / Manager"],
    puntos: [
      ["Semáforo de todos los sorteos", "A traffic light for every sort"],
      ["Alertas de rechazo y fuera de control", "Reject-rate and out-of-control alerts"],
      ["Entrega de turno sin papel", "Paperless shift handover"],
      ["Facturación del mes al instante", "Month-to-date billing instantly"],
    ],
  },
  {
    clave: "cliente",
    titulo: ["Tu cliente", "Your customer"],
    puntos: [
      ["Ve el avance en vivo", "Sees progress live"],
      ["Pareto y fotos de cada defecto", "Pareto and photos of every defect"],
      ["Verifica cada contenedor con su QR", "Verifies every container with its QR"],
      ["Descarga el 8D y el reporte de cierre", "Downloads the 8D and the closing report"],
    ],
  },
];

function Aparecer({ children, retraso = 0, className = "" }: { children: React.ReactNode; retraso?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: retraso, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function BotonDemo({ grande = false }: { grande?: boolean }) {
  const { t } = useIdioma();
  const url = urlDemo(t);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center rounded-md bg-yellow text-navy-900 transition hover:bg-yellow-400 active:scale-[0.98] ${
        grande ? "px-6 py-3" : "px-5 py-3"
      }`}
    >
      {t("Solicitar demo", "Request a demo")}
    </a>
  );
}

function MaquetaApp() {
  const { t, locale } = useIdioma();
  const [buenas, setBuenas] = useState(1240);
  const [aviso, setAviso] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setBuenas((b) => b + 10);
      setAviso((a) => a + 1);
    }, 2600);
    return () => clearInterval(t);
  }, []);

  const puntos = [18, 22, 16, 20, 24, 19, 44, 21, 17];
  const camino = puntos.map((y, i) => `${i === 0 ? "M" : "L"} ${i * 22 + 4} ${60 - y}`).join(" ");

  return (
    <div className="relative mx-auto h-[520px] w-full max-w-[460px]">
      <div className="absolute left-1/2 top-0 w-[250px] -translate-x-1/2">
      <motion.div
        className="relative rounded-[2.2rem] border-[10px] border-navy-950 bg-navy-900 shadow-2xl"
        initial={{ opacity: 0, y: 40, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-white/15" />
        <div className="space-y-3 p-3.5">
          <div className="rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 p-3 text-white">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-yellow">Querétaro</p>
            <p className="font-display text-base font-bold">SF-500</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-white/10 py-2">
                <motion.p key={buenas} initial={{ scale: 1.25, color: "#FDE68A" }} animate={{ scale: 1, color: "#4ADE80" }} className="font-display text-2xl font-extrabold">
                  {buenas.toLocaleString(locale)}
                </motion.p>
                <p className="text-[8px] uppercase text-white/60">{t("Buenas", "Good")}</p>
              </div>
              <div className="rounded-lg bg-white/10 py-2">
                <p className="font-display text-2xl font-extrabold text-red-400">38</p>
                <p className="text-[8px] uppercase text-white/60">{t("Malas", "Rejects")}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-2.5">
            <p className="text-center text-[10px] font-semibold text-emerald-800">{t("Cantidad inspeccionada", "Inspected quantity")}</p>
            <div className="mt-1.5 flex justify-center gap-1">
              {["-1", "+1", "+10", "+100"].map((b) => (
                <span key={b} className="rounded-md border border-navy-200 bg-white px-1.5 py-1 text-[10px] font-bold text-navy-700">
                  {b}
                </span>
              ))}
            </div>
            <motion.div
              className="mt-2 rounded-md bg-emerald-600 py-1.5 text-center text-[10px] font-bold text-white"
              animate={{ scale: [1, 0.95, 1] }}
              transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 2.3 }}
            >
              {t("Registrar 10 piezas", "Log 10 parts")}
            </motion.div>
          </div>
          <div className="rounded-xl bg-red-600 py-2 text-center text-[10px] font-bold text-white">{t("Reportar defecto", "Report defect")}</div>
          <div className="rounded-xl bg-orange-500 py-2 text-center text-[10px] font-bold text-white">{t("Llamar líder", "Call team lead")}</div>
        </div>
        <AnimatePresence>
          <motion.div
            key={aviso}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-3 bottom-4 flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-[10px] font-semibold text-navy-900 shadow-lg"
          >
            {t("+10 piezas registradas", "+10 parts logged")}{" "}
            <span className="ml-auto rounded bg-navy px-1.5 py-0.5 text-[9px] text-white">{t("Deshacer", "Undo")}</span>
          </motion.div>
        </AnimatePresence>
      </motion.div>
      </div>

      <motion.div
        className="absolute -left-2 top-16 w-44 rounded-2xl border border-white/10 bg-navy-950/90 p-3 text-white shadow-xl backdrop-blur sm:-left-8"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
        transition={{ opacity: { delay: 0.5 }, x: { delay: 0.5 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-bold">SM-4410</p>
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
        </div>
        <p className="mt-1 font-display text-2xl font-black text-red-300">11.9%</p>
        <p className="text-[10px] font-semibold text-red-200">{t("Piden apoyo · Estación 3", "Help requested · Station 3")}</p>
      </motion.div>

      <motion.div
        className="absolute -right-2 bottom-0 w-52 rounded-2xl border border-white/10 bg-white p-3 shadow-xl sm:-right-6"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0, y: [0, 6, 0] }}
        transition={{ opacity: { delay: 0.8 }, x: { delay: 0.8 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-500">{t("Gráfica p · por hora", "p-chart · hourly")}</p>
        <svg viewBox="0 0 184 64" className="mt-1 h-16 w-full">
          <line x1="0" x2="184" y1="22" y2="22" stroke="#8A94B8" strokeDasharray="4 3" strokeWidth="1" />
          <line x1="0" x2="184" y1="42" y2="42" stroke="#8A94B8" strokeWidth="1" />
          <motion.path
            d={camino}
            fill="none"
            stroke="#3A50A8"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, delay: 1, ease: "easeInOut" }}
          />
          <motion.circle cx={6 * 22 + 4} cy={60 - 44} r="4" fill="#DC2626" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.6 }} />
        </svg>
        <p className="text-[10px] font-semibold text-red-700">{t("1 hora fuera de control", "1 hour out of control")}</p>
      </motion.div>
    </div>
  );
}

export default function Landing({ registro = false }: { registro?: boolean }) {
  const { t } = useIdioma();
  const [conScroll, setConScroll] = useState(false);
  const [rol, setRol] = useState(ROLES[0].clave);

  useEffect(() => {
    const alScroll = () => setConScroll(window.scrollY > 20);
    alScroll();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  const rolActual = ROLES.find((r) => r.clave === rol)!;

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-navy-900">
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          conScroll ? "bg-navy-950/90 shadow-lg backdrop-blur" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Image src="/logo-header.png" alt={NOMBRE_APP} width={800} height={266} className="h-10 w-auto" priority />
          <nav className="hidden items-center gap-6 text-sm font-medium text-white/80 md:flex">
            <a href="#modulos" className="hover:text-white">{t("Módulos", "Features")}</a>
            <a href="#como-funciona" className="hover:text-white">{t("Cómo funciona", "How it works")}</a>
            <a href="#roles" className="hover:text-white">{t("Para quién", "Who it’s for")}</a>
          </nav>
          <div className="flex items-center gap-3">
            <BotonIdioma oscuro />
            <Link href="/login" className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
              {t("Iniciar sesión", "Sign in")}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_#233581_0%,_#0A163C_45%,_#060E28_100%)] pb-24 pt-28 text-white">
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <p className="flex items-center gap-3 font-titular text-sm font-semibold uppercase tracking-[0.14em] text-yellow">
              <span className="h-0.5 w-8 bg-yellow" aria-hidden />
              {t("Sorteo e inspección automotriz", "Automotive sorting & inspection")}
            </p>
            <h1 className="mt-5 font-titular text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.01em] sm:text-6xl lg:text-[4.25rem]">
              {t("Tu piso de inspección, en tiempo real.", "Your inspection floor, in real time.")}
            </h1>
            <p className="mt-6 max-w-lg font-plex text-base leading-relaxed text-white/80 sm:text-lg">
              {t(
                `${NOMBRE_CORTO} reemplaza las hojas de captura, los grupos de WhatsApp y el Excel de fin de turno. Inspectores capturan en segundos, liderazgo ve el semáforo del piso y tu cliente ve su avance en vivo.`,
                `${NOMBRE_CORTO} replaces paper tally sheets, WhatsApp groups and the end-of-shift spreadsheet. Inspectors log in seconds, leadership sees the floor at a glance and your customer follows progress live.`
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 font-titular text-base font-semibold uppercase tracking-[0.06em]">
              <BotonDemo grande />
              {registro && (
                <Link
                  href="/registro"
                  className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-navy-900 transition hover:bg-white/90"
                >
                  {t("Crear cuenta", "Create account")}
                </Link>
              )}
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-white/30 px-6 py-3 text-white transition hover:bg-white/10"
              >
                {t("Ya tengo cuenta", "I have an account")}
              </Link>
            </div>
            <ul className="mt-10 grid max-w-md grid-cols-2 gap-x-6 gap-y-2 border-t border-white/15 pt-5 font-plex text-sm text-white/65">
              {[
                t("Celular, tablet o TV", "Phone, tablet or TV"),
                t("Funciona sin señal", "Works offline"),
                t("Se instala como app", "Installs as an app"),
                t("Español e inglés", "English & Spanish"),
              ].map((texto) => (
                <li key={texto}>{texto}</li>
              ))}
            </ul>
          </div>
          <MaquetaApp />
        </div>
      </section>

      <section id="modulos" className="mx-auto max-w-6xl px-5 py-24">
        <Aparecer className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-navy-500">{t("Todo en un solo lugar", "All in one place")}</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
            {t("Del contenedor al reporte del cliente", "From the container to the customer report")}
          </h2>
          <p className="mt-3 text-navy-500">
            {t(
              "Cada módulo está pensado para el ritmo real de un sorteo, no para una oficina.",
              "Every feature is built for the real pace of a sort, not for an office."
            )}
          </p>
        </Aparecer>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((m, i) => (
            <Aparecer key={m.titulo[0]} retraso={(i % 3) * 0.08}>
              <motion.div
                whileHover={{ y: -4 }}
                className="group h-full rounded-2xl border border-navy-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-xl"
              >
                <span className="block h-0.5 w-8 bg-yellow" aria-hidden />
                <h3 className="mt-4 font-display text-lg font-bold">{t(...m.titulo)}</h3>
                <p className="mt-1 text-sm text-navy-500">{t(...m.texto)}</p>
              </motion.div>
            </Aparecer>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Aparecer className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-navy-500">{t("Cómo funciona", "How it works")}</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{t("Tres pasos, cero papel", "Three steps, zero paper")}</h2>
          </Aparecer>
          <div className="relative mt-14 grid gap-10 md:grid-cols-3">
            <motion.div
              className="absolute left-[16%] right-[16%] top-8 hidden h-0.5 origin-left bg-gradient-to-r from-yellow to-amber-500 md:block"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
            {[
              {
                n: 1,
                titulo: t("Abre su sorteo", "Opens the sort"),
                texto: t(
                  "El inspector entra al sorteo que tiene asignado y ve el criterio de aceptación.",
                  "The inspector opens their assigned sort and sees the acceptance criteria."
                ),
              },
              {
                n: 2,
                titulo: t("Captura", "Log"),
                texto: t(
                  "Piezas buenas y defectos con foto, aunque no haya señal. El Pareto se arma solo.",
                  "Good parts and defects with photos, even with no signal. The Pareto builds itself."
                ),
              },
              {
                n: 3,
                titulo: t("Todos lo ven", "Everyone sees it"),
                texto: t(
                  "Liderazgo en el semáforo del piso, tu cliente en su enlace en vivo y la factura al cierre.",
                  "Leadership on the floor dashboard, your customer on their live link, and the invoice at close."
                ),
              },
            ].map((p, i) => (
              <Aparecer key={p.n} retraso={0.2 + i * 0.25} className="relative text-center">
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 font-display text-2xl font-bold text-yellow ring-8 ring-white">
                  {p.n}
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{p.titulo}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-navy-500">{p.texto}</p>
              </Aparecer>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="mx-auto max-w-6xl px-5 py-24">
        <Aparecer className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-navy-500">{t("Para quién", "Who it’s for")}</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{t("Una pantalla para cada quien", "A screen for everyone")}</h2>
        </Aparecer>
        <div className="mt-10 flex justify-center">
          <div className="inline-flex flex-wrap justify-center rounded-full border border-navy-200 bg-white p-1">
            {ROLES.map((r) => (
              <button
                key={r.clave}
                onClick={() => setRol(r.clave)}
                className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-colors ${rol === r.clave ? "text-white" : "text-navy-500"}`}
              >
                {rol === r.clave && (
                  <motion.span layoutId="rol-landing" className="absolute inset-0 rounded-full bg-navy" transition={{ type: "spring", stiffness: 500, damping: 36 }} />
                )}
                <span className="relative">{t(...r.titulo)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.ul
              key={rol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="grid gap-3 sm:grid-cols-2"
            >
              {rolActual.puntos.map((p, i) => (
                <motion.li
                  key={p[0]}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm font-medium shadow-sm"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">✓</span>
                  {t(...p)}
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </div>
      </section>

      <section className="px-5 pb-24">
        <Aparecer>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 px-8 py-14 text-center text-white shadow-2xl">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow/20 blur-3xl" />
            <h2 className="relative font-display text-3xl font-extrabold sm:text-4xl">{t("¿Listo para dejar el papel?", "Ready to ditch the paper?")}</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/75">
              {t(
                `Te mostramos ${NOMBRE_CORTO} con un sorteo real en 20 minutos y dejamos tu primera planta configurada.`,
                `We'll walk you through ${NOMBRE_CORTO} with a real sort in 20 minutes and set up your first plant.`
              )}
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3 font-titular text-base font-semibold uppercase tracking-[0.06em]">
              <BotonDemo grande />
              <Link href="/login" className="inline-flex items-center rounded-md border border-white/30 px-6 py-3 transition hover:bg-white/10">
                {t("Iniciar sesión", "Sign in")}
              </Link>
            </div>
          </div>
        </Aparecer>
      </section>

      <footer className="border-t border-navy-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-navy-500">
          <p>
            © {new Date().getFullYear()} {NOMBRE_LEGAL} · {NOMBRE_EMPRESA}
          </p>
          <div className="flex gap-4">
            {CONTACTO_EMAIL && (
              <a href={`mailto:${CONTACTO_EMAIL}`} className="hover:text-navy-900">
                {CONTACTO_EMAIL}
              </a>
            )}
            <Link href="/login" className="hover:text-navy-900">
              {t("Iniciar sesión", "Sign in")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
