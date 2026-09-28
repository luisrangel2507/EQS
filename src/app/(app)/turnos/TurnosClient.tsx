"use client";

import { useEffect, useState } from "react";
import type { Rol } from "@prisma/client";
import { motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import { PLANTAS } from "@/lib/constants";
import { TURNOS, etiquetaTurno, horaLocal, ZONA_HORARIA } from "@/lib/turnos";
import { Kpi } from "@/app/(app)/dashboard/shared";
import Modal from "@/components/ui/Modal";
import { SkeletonPagina } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { consumirParametro } from "@/lib/eventos";

type Fila = { nombre: string; buenas: number; malas: number };

type Relevo = {
  id: string;
  turno: string;
  planta: string | null;
  inicioTurno: string;
  piezasBuenas: number;
  piezasMalas: number;
  novedades: string;
  pendientes: string | null;
  recibidoEn: string | null;
  creadoEn: string;
  autor: { id: string; nombre: string; rol: string };
  recibidoPor: { id: string; nombre: string } | null;
};

type DatosTurnos = {
  turnoActual: { valor: string; inicio: string; fin: string };
  planta: string | null;
  resumen: {
    buenas: number;
    malas: number;
    apoyos: number;
    porInspector: Fila[];
    porInspeccion: (Fila & { id: string })[];
    topDefectos: { tipo: string; cantidad: number }[];
  };
  relevos: Relevo[];
};

function duracion(ms: number) {
  const min = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} h ${min % 60} min` : `${min} min`;
}

export default function TurnosClient({ rol, miId }: { rol: Rol; miId: string }) {
  const toast = useToast();
  const [planta, setPlanta] = useState("");
  const { datos, cargando, recargar } = usePolling<DatosTurnos>(
    `/api/turnos${planta ? `?planta=${encodeURIComponent(planta)}` : ""}`,
    20000
  );
  const [entregando, setEntregando] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000);
    if (consumirParametro("entregar") === "1") setEntregando(true);
    return () => clearInterval(t);
  }, []);

  if (cargando || !datos) return <SkeletonPagina />;

  const turno = TURNOS.find((t) => t.valor === datos.turnoActual.valor)!;
  const inicio = new Date(datos.turnoActual.inicio).getTime();
  const fin = new Date(datos.turnoActual.fin).getTime();
  const avance = Math.min(100, Math.max(0, ((ahora - inicio) / (fin - inicio)) * 100));
  const { resumen } = datos;
  const total = resumen.buenas + resumen.malas;
  const rechazo = total > 0 ? (resumen.malas / total) * 100 : 0;
  const horas = Math.max((ahora - inicio) / 3600000, 1 / 60);
  const maxInspector = Math.max(1, ...resumen.porInspector.map((f) => f.buenas + f.malas));

  async function recibir(id: string) {
    const res = await fetch(`/api/turnos/${id}`, { method: "PATCH" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo recibir el relevo");
      return;
    }
    toast.exito("Relevo recibido");
    recargar();
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 p-6 text-white shadow-xl"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-yellow/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow">Turno en curso</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold">
              {turno.emoji} {turno.etiqueta}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {horaLocal(datos.turnoActual.inicio)} – {horaLocal(datos.turnoActual.fin)} · Faltan{" "}
              {duracion(fin - ahora)}
              {datos.planta ? ` · 🏭 ${datos.planta}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {rol !== "RESIDENTE" && (
              <select
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none"
                value={planta}
                onChange={(e) => setPlanta(e.target.value)}
              >
                <option value="" className="text-navy-900">
                  Todas las plantas
                </option>
                {PLANTAS.map((p) => (
                  <option key={p} value={p} className="text-navy-900">
                    {p}
                  </option>
                ))}
              </select>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              className="btn-accent"
              onClick={() => setEntregando(true)}
            >
              📝 Entregar turno
            </motion.button>
          </div>
        </div>
        <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-yellow to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${avance}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <p className="relative mt-1 text-right text-[11px] text-white/50">{avance.toFixed(0)}% del turno</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi etiqueta="Piezas del turno" valor={total} />
        <Kpi
          etiqueta="% Rechazo"
          valor={rechazo}
          formato={(n) => `${n.toFixed(1)}%`}
          alerta={rechazo >= 8}
          indice={1}
        />
        <Kpi etiqueta="Ritmo (pzas/hora)" valor={total / horas} decimales={1} indice={2} />
        <Kpi etiqueta="Llamados de apoyo" valor={resumen.apoyos} alerta={resumen.apoyos >= 5} indice={3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-display font-semibold text-navy-900">👷 Por inspector</h2>
          {resumen.porInspector.length === 0 ? (
            <p className="text-sm text-navy-400">Nadie ha capturado en este turno todavía.</p>
          ) : (
            <ul className="space-y-3">
              {resumen.porInspector.map((f, i) => {
                const t = f.buenas + f.malas;
                return (
                  <li key={f.nombre}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-navy-900">{f.nombre}</span>
                      <span className="text-navy-500">
                        {t} pzas · <span className="text-red-600">{f.malas} NG</span>
                      </span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-navy-100">
                      <motion.div
                        className="h-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(f.buenas / maxInspector) * 100}%` }}
                        transition={{ delay: i * 0.05, duration: 0.7 }}
                      />
                      <motion.div
                        className="h-full bg-red-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(f.malas / maxInspector) * 100}%` }}
                        transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-display font-semibold text-navy-900">⚠️ Defectos del turno</h2>
          {resumen.topDefectos.length === 0 ? (
            <p className="text-sm text-navy-400">Sin defectos reportados en este turno.</p>
          ) : (
            <ul className="space-y-2">
              {resumen.topDefectos.map((d, i) => (
                <motion.li
                  key={d.tipo}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-red-900">{d.tipo}</span>
                  <span className="font-bold text-red-700">{d.cantidad}</span>
                </motion.li>
              ))}
            </ul>
          )}
          {resumen.porInspeccion.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-navy-500">
                Piezas trabajadas
              </h3>
              <div className="flex flex-wrap gap-2">
                {resumen.porInspeccion.map((p) => (
                  <a
                    key={p.id}
                    href={`/inspecciones/${p.id}`}
                    className="badge bg-navy-50 text-navy-700 hover:bg-navy-100"
                  >
                    {p.nombre} · {p.buenas + p.malas}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 font-display font-semibold text-navy-900">📒 Bitácora de relevos</h2>
        {datos.relevos.length === 0 ? (
          <p className="text-sm text-navy-400">
            Todavía no hay relevos. Al terminar tu turno, usa &ldquo;Entregar turno&rdquo;.
          </p>
        ) : (
          <ol className="relative space-y-5 border-l-2 border-navy-100 pl-6">
            {datos.relevos.map((r, i) => {
              const t = r.piezasBuenas + r.piezasMalas;
              const pendienteRecibir = !r.recibidoPor;
              return (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.05 }}
                  className="relative"
                >
                  <span
                    className={`absolute -left-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${
                      pendienteRecibir ? "animate-respirar bg-amber-400" : "bg-emerald-500"
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display font-semibold text-navy-900">
                      {etiquetaTurno(r.turno)}
                      <span className="ml-2 text-sm font-normal text-navy-500">
                        {new Date(r.inicioTurno).toLocaleDateString("es-MX", {
                          timeZone: ZONA_HORARIA,
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })}
                        {r.planta ? ` · 🏭 ${r.planta}` : ""}
                      </span>
                    </p>
                    <span className="text-xs text-navy-400">
                      Entregó {r.autor.nombre} a las {horaLocal(r.creadoEn)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="badge bg-navy-50 text-navy-700">📦 {t} piezas</span>
                    <span className="badge bg-red-50 text-red-700">
                      ❌ {r.piezasMalas} NG ({t > 0 ? ((r.piezasMalas / t) * 100).toFixed(1) : "0.0"}%)
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-navy-700">{r.novedades}</p>
                  {r.pendientes && (
                    <div className="mt-2 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <span className="font-semibold">Pendientes: </span>
                      <span className="whitespace-pre-wrap">{r.pendientes}</span>
                    </div>
                  )}
                  <div className="mt-2">
                    {r.recibidoPor ? (
                      <span className="text-xs font-semibold text-emerald-700">
                        ✓ Recibido por {r.recibidoPor.nombre}
                        {r.recibidoEn ? ` a las ${horaLocal(r.recibidoEn)}` : ""}
                      </span>
                    ) : r.autor.id !== miId ? (
                      <button className="btn-primary px-3 py-1 text-xs" onClick={() => recibir(r.id)}>
                        ✓ Recibir turno
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700">⏳ Esperando a quien recibe</span>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>

      <Modal abierto={entregando} onCerrar={() => setEntregando(false)}>
        <EntregarTurnoForm
          rol={rol}
          plantaInicial={datos.planta ?? ""}
          etiqueta={`${turno.emoji} ${turno.etiqueta}`}
          total={total}
          malas={resumen.malas}
          onCerrar={() => setEntregando(false)}
          onEntregado={() => {
            setEntregando(false);
            toast.exito("Turno entregado. ¡Buen descanso!");
            recargar();
          }}
        />
      </Modal>
    </div>
  );
}

function EntregarTurnoForm({
  rol,
  plantaInicial,
  etiqueta,
  total,
  malas,
  onCerrar,
  onEntregado,
}: {
  rol: Rol;
  plantaInicial: string;
  etiqueta: string;
  total: number;
  malas: number;
  onCerrar: () => void;
  onEntregado: () => void;
}) {
  const [planta, setPlanta] = useState(plantaInicial);
  const [novedades, setNovedades] = useState("");
  const [pendientes, setPendientes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/turnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planta: planta || null, novedades, pendientes: pendientes || null }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo entregar el turno");
      return;
    }
    onEntregado();
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-xl bg-white p-5 shadow-lg">
      <h2 className="font-display text-lg font-bold text-navy-900">Entregar {etiqueta}</h2>
      <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-navy-50 py-2">
            <p className="font-display text-xl font-bold text-navy-900">{total}</p>
            <p className="text-[11px] uppercase tracking-wide text-navy-500">Piezas</p>
          </div>
          <div className="rounded-lg bg-red-50 py-2">
            <p className="font-display text-xl font-bold text-red-700">{malas}</p>
            <p className="text-[11px] uppercase tracking-wide text-red-700/70">NG</p>
          </div>
      </div>
      <p className="text-xs text-navy-400">Los números se guardan automáticamente al entregar.</p>
      {rol !== "RESIDENTE" && (
        <div>
          <label className="label">Planta</label>
          <select className="input" value={planta} onChange={(e) => setPlanta(e.target.value)}>
            <option value="">Todas / no aplica</option>
            {PLANTAS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label">¿Qué pasó en el turno?</label>
        <textarea
          className="input"
          rows={4}
          required
          minLength={3}
          placeholder="Ej. Se contuvo lote 4521 por rebaba, faltó material 40 min en estación 3…"
          value={novedades}
          onChange={(e) => setNovedades(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Pendientes para quien entra (opcional)</label>
        <textarea
          className="input"
          rows={3}
          placeholder="Ej. Terminar de sortear 300 pzas de SF-500, confirmar Punto Limpio con cliente…"
          value={pendientes}
          onChange={(e) => setPendientes(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? "Entregando…" : "Entregar turno"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCerrar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
