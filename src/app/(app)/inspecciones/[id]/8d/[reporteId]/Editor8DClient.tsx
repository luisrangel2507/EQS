"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { DISCIPLINAS, avance8D, type ClaveDisciplina } from "@/lib/ochoD";
import { MiniAnillo } from "@/components/Reportes8DCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { vibrar } from "@/lib/feedback";

type Reporte = Record<ClaveDisciplina, string | null> & {
  id: string;
  folio: number;
  defecto: string | null;
  estado: string;
  cerradoEn: string | null;
  puedeEditar: boolean;
  creadoPor: { nombre: string };
  inspeccion: { id: string; nombre: string; numeroParte: string | null; cliente: string | null; planta: string | null };
};

type EstadoGuardado = "guardado" | "pendiente" | "guardando" | "error";

export default function Editor8DClient({ inspeccionId, reporteId }: { inspeccionId: string; reporteId: string }) {
  const toast = useToast();
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activo, setActivo] = useState<ClaveDisciplina>("d1Equipo");
  const [guardado, setGuardado] = useState<EstadoGuardado>("guardado");
  const pendientes = useRef<Partial<Record<ClaveDisciplina, string>>>({});
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/8d/${reporteId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "No se pudo cargar el 8D");
        setReporte(d);
      })
      .catch((e) => setError(e.message));
  }, [reporteId]);

  const guardar = useCallback(async () => {
    const cambios = pendientes.current;
    if (Object.keys(cambios).length === 0) return;
    pendientes.current = {};
    setGuardado("guardando");
    const res = await fetch(`/api/8d/${reporteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    }).catch(() => null);
    if (!res?.ok) {
      pendientes.current = { ...cambios, ...pendientes.current };
      setGuardado("error");
      return;
    }
    setGuardado(Object.keys(pendientes.current).length ? "pendiente" : "guardado");
  }, [reporteId]);

  useEffect(() => {
    const antesDeSalir = (e: BeforeUnloadEvent) => {
      if (Object.keys(pendientes.current).length) e.preventDefault();
    };
    window.addEventListener("beforeunload", antesDeSalir);
    return () => {
      window.removeEventListener("beforeunload", antesDeSalir);
      guardar();
    };
  }, [guardar]);

  function cambiar(clave: ClaveDisciplina, valor: string) {
    setReporte((r) => (r ? { ...r, [clave]: valor } : r));
    pendientes.current[clave] = valor;
    setGuardado("pendiente");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(guardar, 900);
  }

  async function cambiarEstado(estado: "abierto" | "cerrado") {
    await guardar();
    const res = await fetch(`/api/8d/${reporteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo actualizar el 8D");
      return;
    }
    setReporte((r) => (r ? { ...r, estado, cerradoEn: d.cerradoEn } : r));
    if (estado === "cerrado") {
      vibrar("exito");
      toast.exito("🏆 8D cerrado. ¡Buen trabajo, equipo!");
    } else {
      toast.info("8D reabierto");
    }
  }

  if (error) return <div className="card text-sm text-red-600">{error}</div>;
  if (!reporte) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const completas = avance8D(reporte);
  const cerrado = reporte.estado === "cerrado";
  const editable = reporte.puedeEditar && !cerrado;
  const indicador = {
    guardado: { texto: "✓ Guardado", clase: "text-emerald-600" },
    pendiente: { texto: "Editando…", clase: "text-navy-400" },
    guardando: { texto: "Guardando…", clase: "text-navy-500" },
    error: { texto: "⚠️ Sin guardar, reintentando al editar", clase: "text-red-600" },
  }[guardado];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/inspecciones/${inspeccionId}`} className="text-xs font-semibold text-navy-400 hover:text-navy-700">
            ← {reporte.inspeccion.numeroParte ?? reporte.inspeccion.nombre}
          </Link>
          <h1 className="font-display text-2xl font-bold text-navy-900">
            8D-{String(reporte.folio).padStart(4, "0")} · {reporte.defecto ?? "General"}
          </h1>
          <p className="text-sm text-navy-500">
            {reporte.inspeccion.cliente ? `${reporte.inspeccion.cliente} · ` : ""}
            Responsable: {reporte.creadoPor.nombre}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editable && <span className={`text-xs font-semibold ${indicador.clase}`}>{indicador.texto}</span>}
          <a href={`/api/8d/${reporteId}/pdf`} target="_blank" rel="noreferrer" className="btn-secondary">
            📄 PDF
          </a>
          {reporte.puedeEditar &&
            (cerrado ? (
              <button className="btn-secondary" onClick={() => cambiarEstado("abierto")}>
                Reabrir
              </button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.96 }}
                className="btn-accent"
                disabled={completas < DISCIPLINAS.length}
                title={completas < DISCIPLINAS.length ? "Completa las 8 disciplinas" : undefined}
                onClick={() => cambiarEstado("cerrado")}
              >
                ✅ Cerrar 8D
              </motion.button>
            ))}
        </div>
      </div>

      <AnimatePresence>
        {cerrado && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-4 text-white shadow-lg"
          >
            <p className="font-display text-lg font-bold">🏆 8D cerrado</p>
            <p className="text-sm text-white/85">
              {reporte.cerradoEn ? `El ${new Date(reporte.cerradoEn).toLocaleDateString("es-MX")}. ` : ""}
              Queda en solo lectura; reábrelo si hay que ajustar algo.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <nav className="card h-fit space-y-1 p-3 lg:sticky lg:top-24">
          <div className="mb-2 flex items-center gap-3 px-2">
            <MiniAnillo valor={completas} total={DISCIPLINAS.length} />
            <p className="text-sm font-semibold text-navy-700">
              {completas === DISCIPLINAS.length ? "Listo para cerrar" : `${DISCIPLINAS.length - completas} por completar`}
            </p>
          </div>
          {DISCIPLINAS.map((d) => {
            const lleno = (reporte[d.clave] ?? "").trim().length > 0;
            return (
              <button
                key={d.clave}
                onClick={() => {
                  setActivo(d.clave);
                  document.getElementById(d.clave)?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className={`relative flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                  activo === d.clave ? "text-navy-900" : "text-navy-500 hover:bg-navy-50"
                }`}
              >
                {activo === d.clave && (
                  <motion.span layoutId="d-activa" className="absolute inset-0 rounded-lg bg-navy-50" />
                )}
                <span
                  className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    lleno ? "bg-emerald-500 text-white" : "bg-navy-100 text-navy-500"
                  }`}
                >
                  {lleno ? "✓" : d.codigo}
                </span>
                <span className="relative truncate font-medium">{d.titulo}</span>
              </button>
            );
          })}
        </nav>

        <div className="space-y-4">
          {DISCIPLINAS.map((d, i) => (
            <motion.section
              key={d.clave}
              id={d.clave}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`card transition-shadow ${activo === d.clave ? "ring-2 ring-navy-300" : ""}`}
              onFocus={() => setActivo(d.clave)}
            >
              <div className="mb-2 flex items-baseline gap-2">
                <span className="rounded-md bg-navy px-2 py-0.5 font-display text-xs font-bold text-white">{d.codigo}</span>
                <h2 className="font-display font-semibold text-navy-900">{d.titulo}</h2>
              </div>
              <p className="mb-2 text-xs text-navy-400">{d.ayuda}</p>
              {editable ? (
                <textarea
                  className="input min-h-[96px]"
                  rows={4}
                  value={reporte[d.clave] ?? ""}
                  onChange={(e) => cambiar(d.clave, e.target.value)}
                  onBlur={guardar}
                  placeholder="Escribe aquí…"
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-navy-700">
                  {reporte[d.clave]?.trim() || <span className="text-navy-400">Pendiente</span>}
                </p>
              )}
            </motion.section>
          ))}
        </div>
      </div>
    </div>
  );
}
