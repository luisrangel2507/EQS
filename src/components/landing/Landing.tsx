"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CONTACTO_EMAIL, CONTACTO_WHATSAPP, NOMBRE_APP, NOMBRE_CORTO, NOMBRE_EMPRESA, NOMBRE_LEGAL } from "@/lib/branding";

const urlDemo = CONTACTO_WHATSAPP
  ? `https://wa.me/${CONTACTO_WHATSAPP}?text=${encodeURIComponent(`Hola, me interesa una demo de ${NOMBRE_APP}.`)}`
  : CONTACTO_EMAIL
    ? `mailto:${CONTACTO_EMAIL}?subject=${encodeURIComponent(`Demo de ${NOMBRE_APP}`)}`
    : null;

const MODULOS = [
  { icono: "📱", titulo: "Captura en piso", texto: "Botones grandes, vibración y deshacer. Hecha para usarse con guantes y prisa." },
  { icono: "📡", titulo: "Funciona sin señal", texto: "Las capturas y fotos se guardan en el equipo y se sincronizan solas al volver la red." },
  { icono: "📷", titulo: "Escaneo QR", texto: "Etiqueta imprimible por inspección: escanea y el inspector ya está capturando." },
  { icono: "📺", titulo: "Modo TV Andon", texto: "Pantalla de piso con semáforo por sorteo, llamados de apoyo y alertas en vivo." },
  { icono: "📉", titulo: "Control estadístico", texto: "Gráfica p por hora con límites de control y fecha estimada de término." },
  { icono: "🔗", titulo: "Portal del cliente", texto: "Un enlace en vivo con avance, Pareto y fotos. Sin cuentas, sin llamadas de seguimiento." },
  { icono: "🛠️", titulo: "Reportes 8D", texto: "Se llenan solos con los datos del sorteo y salen en PDF listo para el cliente." },
  { icono: "💰", titulo: "Facturación", texto: "Piezas × precio por cliente y mes, con estado de cuenta en PDF." },
  { icono: "🕐", titulo: "Turnos y relevos", texto: "Bitácora de entrega de turno con los números del turno guardados solos." },
];

const ROLES = [
  {
    clave: "inspector",
    titulo: "Inspector",
    puntos: ["Escanea la etiqueta y empieza", "Registra piezas en dos toques", "Pide apoyo con un botón", "Ve su ritmo y su lugar en el ranking"],
  },
  {
    clave: "liderazgo",
    titulo: "Supervisor / Gerente",
    puntos: ["Semáforo de todos los sorteos", "Alertas de rechazo y fuera de control", "Entrega de turno sin papel", "Facturación del mes al instante"],
  },
  {
    clave: "cliente",
    titulo: "Tu cliente",
    puntos: ["Ve el avance en vivo", "Pareto y fotos de cada defecto", "Recibe aviso al salir una pieza NG", "Descarga el 8D y el reporte de cierre"],
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
  if (!urlDemo) return null;
  return (
    <motion.a
      href={urlDemo}
      target="_blank"
      rel="noreferrer"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-yellow font-bold text-navy-900 shadow-[0_10px_30px_-10px_rgba(244,217,53,0.7)] ${
        grande ? "px-7 py-4 text-lg" : "px-5 py-3"
      }`}
    >
      Solicitar demo →
    </motion.a>
  );
}

function MaquetaApp() {
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
                  {buenas.toLocaleString("es-MX")}
                </motion.p>
                <p className="text-[8px] uppercase text-white/60">✅ Buenas</p>
              </div>
              <div className="rounded-lg bg-white/10 py-2">
                <p className="font-display text-2xl font-extrabold text-red-400">38</p>
                <p className="text-[8px] uppercase text-white/60">❌ Malas</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-2.5">
            <p className="text-center text-[10px] font-semibold text-emerald-800">📦 Cantidad inspeccionada</p>
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
              Registrar 10 piezas
            </motion.div>
          </div>
          <div className="rounded-xl bg-red-600 py-2 text-center text-[10px] font-bold text-white">⚠️ Reportar defecto</div>
          <div className="rounded-xl bg-orange-500 py-2 text-center text-[10px] font-bold text-white">🔔 Llamar líder</div>
        </div>
        <AnimatePresence>
          <motion.div
            key={aviso}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-3 bottom-4 flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-[10px] font-semibold text-navy-900 shadow-lg"
          >
            ✅ +10 piezas registradas <span className="ml-auto rounded bg-navy px-1.5 py-0.5 text-[9px] text-white">Deshacer</span>
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
        <p className="text-[10px] font-semibold text-red-200">🔔 Piden apoyo · Estación 3</p>
      </motion.div>

      <motion.div
        className="absolute -right-2 bottom-0 w-52 rounded-2xl border border-white/10 bg-white p-3 shadow-xl sm:-right-6"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0, y: [0, 6, 0] }}
        transition={{ opacity: { delay: 0.8 }, x: { delay: 0.8 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-500">Gráfica p · por hora</p>
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
        <p className="text-[10px] font-semibold text-red-700">⚠️ 1 hora fuera de control</p>
      </motion.div>
    </div>
  );
}

export default function Landing() {
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
            <a href="#modulos" className="hover:text-white">Módulos</a>
            <a href="#como-funciona" className="hover:text-white">Cómo funciona</a>
            <a href="#roles" className="hover:text-white">Para quién</a>
          </nav>
          <Link href="/login" className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_#233581_0%,_#0A163C_45%,_#060E28_100%)] pb-24 pt-28 text-white">
        <motion.div
          className="pointer-events-none absolute -right-32 top-10 h-[28rem] w-[28rem] rounded-full bg-yellow/20 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-yellow"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Sorteo e inspección automotriz
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl"
            >
              Tu piso de inspección,{" "}
              <span className="bg-gradient-to-r from-yellow via-amber-300 to-orange-400 bg-clip-text text-transparent">en tiempo real</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-5 max-w-xl text-lg text-white/75"
            >
              {NOMBRE_CORTO} reemplaza las hojas de captura, los grupos de WhatsApp y el Excel de fin de turno. Inspectores capturan en
              segundos, liderazgo ve el semáforo del piso y tu cliente ve su avance en vivo.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <BotonDemo grande />
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/25 px-7 py-4 text-lg font-semibold text-white transition hover:bg-white/10"
              >
                Ya tengo cuenta
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60"
            >
              <span>✓ Celular, tablet o TV</span>
              <span>✓ Funciona sin señal</span>
              <span>✓ Se instala como app</span>
            </motion.div>
          </div>
          <MaquetaApp />
        </div>
      </section>

      <section id="modulos" className="mx-auto max-w-6xl px-5 py-24">
        <Aparecer className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-navy-500">Todo en un solo lugar</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Del contenedor al reporte del cliente</h2>
          <p className="mt-3 text-navy-500">Cada módulo está pensado para el ritmo real de un sorteo, no para una oficina.</p>
        </Aparecer>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((m, i) => (
            <Aparecer key={m.titulo} retraso={(i % 3) * 0.08}>
              <motion.div
                whileHover={{ y: -4 }}
                className="group h-full rounded-2xl border border-navy-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-xl"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 text-2xl shadow-md transition-transform group-hover:scale-110 group-hover:rotate-3">
                  {m.icono}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{m.titulo}</h3>
                <p className="mt-1 text-sm text-navy-500">{m.texto}</p>
              </motion.div>
            </Aparecer>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Aparecer className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-navy-500">Cómo funciona</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Tres pasos, cero papel</h2>
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
              { n: 1, icono: "📷", titulo: "Escanea", texto: "El inspector escanea la etiqueta QR del contenedor y ve el criterio de aceptación." },
              { n: 2, icono: "👆", titulo: "Captura", texto: "Piezas buenas y defectos con foto, aunque no haya señal. El Pareto se arma solo." },
              { n: 3, icono: "📊", titulo: "Todos lo ven", texto: "Liderazgo en el semáforo del piso, tu cliente en su enlace en vivo y la factura al cierre." },
            ].map((p, i) => (
              <Aparecer key={p.n} retraso={0.2 + i * 0.25} className="relative text-center">
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-3xl shadow-lg ring-8 ring-white">
                  {p.icono}
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow text-xs font-black text-navy-900">
                    {p.n}
                  </span>
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
          <p className="text-sm font-semibold uppercase tracking-widest text-navy-500">Para quién</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Una pantalla para cada quien</h2>
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
                <span className="relative">{r.titulo}</span>
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
                  key={p}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm font-medium shadow-sm"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">✓</span>
                  {p}
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
            <h2 className="relative font-display text-3xl font-extrabold sm:text-4xl">¿Listo para dejar el papel?</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/75">
              Te mostramos {NOMBRE_CORTO} con un sorteo real en 20 minutos y dejamos tu primera planta configurada.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <BotonDemo grande />
              <Link href="/login" className="inline-flex items-center rounded-xl border border-white/25 px-7 py-4 text-lg font-semibold hover:bg-white/10">
                Iniciar sesión
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
              Iniciar sesión
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
