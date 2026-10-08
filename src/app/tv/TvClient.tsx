"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import { PLANTAS } from "@/lib/constants";
import { NOMBRE_APP } from "@/lib/branding";
import { TURNOS, ZONA_HORARIA, horaLocal } from "@/lib/turnos";
import type { Andon, DatosTv, SorteoTv } from "@/lib/tv";
import NumeroAnimado from "@/components/ui/NumeroAnimado";

const ROTACION_MS = 12000;

function horaEta(iso: string) {
  const fecha = new Date(iso);
  const dia = (d: Date) => d.toLocaleDateString("es-MX", { timeZone: ZONA_HORARIA });
  if (dia(fecha) === dia(new Date())) return horaLocal(fecha);
  return `${fecha.toLocaleDateString("es-MX", { timeZone: ZONA_HORARIA, weekday: "short" })} ${horaLocal(fecha)}`;
}

const LUZ: Record<Andon, { punto: string; borde: string; brillo: string; texto: string; etiqueta: string }> = {
  rojo: { punto: "bg-red-500", borde: "border-red-500/60", brillo: "shadow-[0_0_28px_rgba(239,68,68,0.55)]", texto: "text-red-300", etiqueta: "Detener / atender" },
  amarillo: { punto: "bg-amber-400", borde: "border-amber-400/50", brillo: "shadow-[0_0_22px_rgba(251,191,36,0.35)]", texto: "text-amber-200", etiqueta: "Vigilar" },
  verde: { punto: "bg-emerald-400", borde: "border-white/10", brillo: "", texto: "text-emerald-200", etiqueta: "En orden" },
};

function Reloj() {
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => {
    setAhora(new Date());
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!ahora) return <span className="font-display text-4xl font-bold tabular-nums">--:--:--</span>;
  return (
    <div className="text-right">
      <p className="font-display text-4xl font-bold tabular-nums leading-none xl:text-5xl">
        {ahora.toLocaleTimeString("es-MX", { timeZone: ZONA_HORARIA, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
      </p>
      <p className="mt-1 text-sm text-white/60">
        {ahora
          .toLocaleDateString("es-MX", { timeZone: ZONA_HORARIA, weekday: "long", day: "numeric", month: "long" })
          .replace(/^./, (l) => l.toUpperCase())}
      </p>
    </div>
  );
}

function tocarAlarma(ctx: AudioContext) {
  const t = ctx.currentTime;
  [880, 660, 880].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gan = ctx.createGain();
    osc.frequency.value = f;
    osc.type = "sine";
    gan.gain.setValueAtTime(0.0001, t + i * 0.22);
    gan.gain.exponentialRampToValueAtTime(0.35, t + i * 0.22 + 0.02);
    gan.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.2);
    osc.connect(gan).connect(ctx.destination);
    osc.start(t + i * 0.22);
    osc.stop(t + i * 0.22 + 0.21);
  });
}

function Kpi({ etiqueta, valor, formato, alerta }: { etiqueta: string; valor: number; formato?: (n: number) => string; alerta?: boolean }) {
  return (
    <div className={`rounded-2xl border px-5 py-4 ${alerta ? "animate-respirar border-red-500/50 bg-red-500/10" : "border-white/10 bg-white/5"}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-white/50">{etiqueta}</p>
      <p className={`mt-1 font-display text-4xl font-extrabold xl:text-5xl ${alerta ? "text-red-300" : "text-yellow"}`}>
        <NumeroAnimado valor={valor} formato={formato} />
      </p>
    </div>
  );
}

function Mosaico({ s }: { s: SorteoTv }) {
  const luz = LUZ[s.andon];
  const total = s.buenas + s.malas;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`relative overflow-hidden rounded-2xl border bg-white/[0.04] p-4 ${luz.borde} ${luz.brillo}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-2xl font-extrabold">{s.numeroParte ?? s.nombre}</p>
          <p className="truncate text-sm text-white/50">
            {s.cliente ?? "—"}
            {s.planta ? ` · ${s.planta}` : ""}
          </p>
        </div>
        <span className="relative mt-1 flex h-5 w-5 shrink-0" aria-label={luz.etiqueta}>
          {s.andon !== "verde" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${luz.punto}`} />}
          <span className={`relative inline-flex h-5 w-5 rounded-full ${luz.punto}`} />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="font-display text-4xl font-black tabular-nums">
            <NumeroAnimado valor={total} />
          </p>
          <p className="text-xs uppercase tracking-wide text-white/50">piezas</p>
        </div>
        <div className="text-right">
          <p className={`font-display text-3xl font-extrabold tabular-nums ${s.rechazo >= 0.08 ? "text-red-300" : s.rechazo >= 0.05 ? "text-amber-200" : "text-emerald-200"}`}>
            {(s.rechazo * 100).toFixed(1)}%
          </p>
          <p className="text-xs uppercase tracking-wide text-white/50">rechazo</p>
        </div>
      </div>
      {s.avance !== null && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-yellow to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${s.avance * 100}%` }}
            transition={{ duration: 1 }}
          />
        </div>
      )}
      <p className={`mt-2 min-h-[1.25rem] truncate text-sm font-semibold ${luz.texto}`}>
        {s.motivos.length ? s.motivos.join(" · ") : s.pronostico.eta ? `Termina ~${horaEta(s.pronostico.eta)}` : luz.etiqueta}
      </p>
    </motion.div>
  );
}

function Destacado({ s }: { s: SorteoTv }) {
  const luz = LUZ[s.andon];
  const max = Math.max(1, ...s.topDefectos.map((d) => d.cantidad));
  const p = s.pronostico;
  return (
    <motion.div
      key={s.id}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full flex-col"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-yellow">En foco</p>
      <h2 className="mt-1 font-display text-4xl font-black leading-tight">{s.numeroParte ?? s.nombre}</h2>
      <p className="text-white/60">{s.nombre}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${luz.borde} ${luz.texto}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${luz.punto}`} /> {luz.etiqueta}
        </span>
        {s.cliente && <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{s.cliente}</span>}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-white/5 py-3">
          <p className="font-display text-3xl font-extrabold text-emerald-300">{s.buenas.toLocaleString("es-MX")}</p>
          <p className="text-[11px] uppercase tracking-wide text-white/50">Buenas</p>
        </div>
        <div className="rounded-xl bg-white/5 py-3">
          <p className="font-display text-3xl font-extrabold text-red-300">{s.malas.toLocaleString("es-MX")}</p>
          <p className="text-[11px] uppercase tracking-wide text-white/50">Malas</p>
        </div>
        <div className="rounded-xl bg-white/5 py-3">
          <p className="flex min-h-[2.25rem] items-center justify-center font-display text-xl font-extrabold text-yellow xl:text-2xl">
            {p.eta ? horaEta(p.eta) : p.estado === "terminada" ? "" : "—"}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-white/50">
            {p.estado === "en_riesgo" ? "Termina (tarde)" : "Termina aprox."}
          </p>
        </div>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-white/50">Principales defectos</p>
      {s.topDefectos.length === 0 ? (
        <p className="mt-2 text-white/50">Sin defectos.</p>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {s.topDefectos.map((d, i) => (
            <li key={d.tipo}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="truncate">{d.tipo}</span>
                <span className="font-bold tabular-nums">{d.cantidad}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-red-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(d.cantidad / max) * 100}%` }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.7 }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {s.inspectores.length > 0 && (
        <p className="mt-auto pt-4 text-sm text-white/50">{s.inspectores.join(", ")}</p>
      )}
    </motion.div>
  );
}

export default function TvClient({ plantaInicial, puedeElegirPlanta }: { plantaInicial: string | null; puedeElegirPlanta: boolean }) {
  const router = useRouter();
  const [planta, setPlanta] = useState(plantaInicial ?? "");
  const { datos, error } = usePolling<DatosTv>(`/api/tv${planta ? `?planta=${encodeURIComponent(planta)}` : ""}`, 10000);
  const [foco, setFoco] = useState(0);
  const [sonido, setSonido] = useState(false);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const vistas = useRef<Set<string> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setFoco((f) => f + 1), ROTACION_MS);
    return () => clearInterval(t);
  }, []);

  // la pantalla de piso no debe apagarse sola
  useEffect(() => {
    let bloqueo: { release: () => Promise<void> } | null = null;
    const pedir = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
        if (document.visibilityState === "visible" && nav.wakeLock) bloqueo = await nav.wakeLock.request("screen");
      } catch {
        // sin permiso para wake lock: la pantalla sigue su configuración normal
      }
    };
    pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      document.removeEventListener("visibilitychange", pedir);
      bloqueo?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const cambio = () => setPantallaCompleta(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", cambio);
    return () => document.removeEventListener("fullscreenchange", cambio);
  }, []);

  // alarma sonora solo para alertas críticas nuevas
  useEffect(() => {
    if (!datos) return;
    const criticas = datos.alertas.filter((a) => a.nivel === "critica").map((a) => a.id);
    if (vistas.current && sonido && audio.current && criticas.some((id) => !vistas.current!.has(id))) {
      tocarAlarma(audio.current);
    }
    vistas.current = new Set(criticas);
  }, [datos, sonido]);

  function alternarSonido() {
    if (!audio.current) audio.current = new AudioContext();
    audio.current.resume();
    if (!sonido) tocarAlarma(audio.current);
    setSonido(!sonido);
  }

  function alternarPantallaCompleta() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  function cambiarPlanta(valor: string) {
    setPlanta(valor);
    router.replace(valor ? `/tv?planta=${encodeURIComponent(valor)}` : "/tv");
  }

  if (!datos) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-950 text-white">
        <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity }} className="font-display text-2xl">
          Cargando piso…
        </motion.p>
      </main>
    );
  }

  const turno = TURNOS.find((t) => t.valor === datos.turno.valor)!;
  const inicio = new Date(datos.turno.inicio).getTime();
  const fin = new Date(datos.turno.fin).getTime();
  const avanceTurno = Math.min(100, Math.max(0, ((Date.now() - inicio) / (fin - inicio)) * 100));
  const destacado = datos.sorteos.length ? datos.sorteos[foco % datos.sorteos.length] : null;
  const apoyoUrgente = datos.alertas.find((a) => a.id.startsWith("apoyo-"));
  const cinta = datos.alertas.length ? datos.alertas : [{ id: "ok", nivel: "aviso" as const, texto: "Sin alertas en piso", desde: datos.ahora }];

  return (
    <main className="flex min-h-screen flex-col gap-4 overflow-hidden bg-[radial-gradient(ellipse_at_top,_#142B6B_0%,_#060E28_60%)] p-5 text-white xl:p-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <Image src="/logo-header.png" alt={NOMBRE_APP} width={1200} height={304} className="h-12 w-auto" priority />
          <div>
            <p className="font-display text-2xl font-bold">
              {turno.etiqueta}
              {datos.planta ? <span className="text-white/60"> · {datos.planta}</span> : null}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-yellow" style={{ width: `${avanceTurno}%` }} />
              </div>
              <span className="text-xs text-white/50">
                {horaLocal(datos.turno.inicio)}–{horaLocal(datos.turno.fin)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200">Sin conexión · último dato</span>}
          <div className="flex items-center gap-1 opacity-60 transition hover:opacity-100">
            {puedeElegirPlanta && (
              <select
                value={planta}
                onChange={(e) => cambiarPlanta(e.target.value)}
                className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white outline-none"
                aria-label="Planta"
              >
                <option value="" className="text-navy-900">Todas las plantas</option>
                {PLANTAS.map((p) => (
                  <option key={p} value={p} className="text-navy-900">{p}</option>
                ))}
              </select>
            )}
            <button onClick={alternarSonido} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-white/10" title="Alarma sonora">
              {sonido ? "Sonido: sí" : "Sonido: no"}
            </button>
            <button onClick={alternarPantallaCompleta} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-white/10" title="Pantalla completa">
              {pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
            </button>
            <Link href="/dashboard" className="rounded-lg px-2.5 py-1.5 text-xl hover:bg-white/10" title="Salir del modo TV">
              ✕
            </Link>
          </div>
          <Reloj />
        </div>
      </header>

      <AnimatePresence>
        {apoyoUrgente && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <motion.div
              animate={{ backgroundColor: ["rgba(220,38,38,0.95)", "rgba(153,27,27,0.95)", "rgba(220,38,38,0.95)"] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="flex items-center justify-between gap-4 rounded-2xl px-6 py-4"
            >
              <p className="font-display text-3xl font-black">{apoyoUrgente.texto}</p>
              <p className="font-display text-2xl font-bold tabular-nums">
                hace {Math.max(0, Math.floor((Date.now() - new Date(apoyoUrgente.desde).getTime()) / 60000))} min
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi etiqueta="Piezas del turno" valor={datos.kpis.piezasTurno} />
        <Kpi
          etiqueta="% Rechazo turno"
          valor={datos.kpis.rechazoTurno * 100}
          formato={(n) => `${n.toFixed(1)}%`}
          alerta={datos.kpis.rechazoTurno >= 0.08}
        />
        <Kpi etiqueta="Ritmo pzas/h" valor={datos.kpis.ritmoTurno} formato={(n) => n.toFixed(0)} />
        <Kpi etiqueta="Sorteos activos" valor={datos.kpis.sorteosActivos} />
        <Kpi etiqueta="En rojo" valor={datos.kpis.enRojo} alerta={datos.kpis.enRojo > 0} />
      </section>

      <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
        <div className="min-h-0 lg:col-span-2">
          {datos.sorteos.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 text-2xl text-white/50">
              No hay sorteos activos
            </div>
          ) : (
            <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {datos.sorteos.map((s) => (
                  <Mosaico key={s.id} s={s} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
        <aside className="relative min-h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <AnimatePresence mode="wait">{destacado && <Destacado key={destacado.id} s={destacado} />}</AnimatePresence>
          {datos.sorteos.length > 1 && (
            <div className="absolute inset-x-6 bottom-3 flex gap-1.5">
              {datos.sorteos.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1 flex-1 rounded-full ${i === foco % datos.sorteos.length ? "bg-yellow" : "bg-white/15"}`}
                />
              ))}
            </div>
          )}
        </aside>
      </section>

      <footer className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30 py-3">
        <div className="flex w-max animate-cinta gap-12 whitespace-nowrap pl-6 text-lg font-semibold">
          {[...cinta, ...cinta].map((a, i) => (
            <span key={`${a.id}-${i}`} className={a.nivel === "critica" ? "text-red-300" : "text-amber-100"}>
              {a.texto}
            </span>
          ))}
        </div>
      </footer>
    </main>
  );
}
