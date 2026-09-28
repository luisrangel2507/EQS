"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import { Kpi } from "@/app/(app)/dashboard/shared";
import Modal from "@/components/ui/Modal";
import { SkeletonPagina } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { duracionTexto } from "@/components/JornadaBarra";

type Fila = {
  id: string;
  usuario: { id: string; nombre: string };
  inspeccion: { id: string; nombre: string; numeroParte: string | null; cliente: string | null; modoCobro: string } | null;
  entrada: string;
  salida: string | null;
  horas: number;
  cerradaAuto: boolean;
  automatica: boolean;
  nota: string | null;
};

type Datos = {
  filas: Fila[];
  enPlanta: Fila[];
  porInspector: { nombre: string; horas: number }[];
  porCliente: { nombre: string; horas: number }[];
  totalHoras: number;
  porRevisar: number;
};

const PERIODOS = [
  { valor: "hoy", etiqueta: "Hoy" },
  { valor: "semana", etiqueta: "7 días" },
  { valor: "mes", etiqueta: "Mes" },
];

const hora = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// valor para <input type="datetime-local"> en la hora del navegador
const aLocal = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function Barras({ titulo, filas }: { titulo: string; filas: { nombre: string; horas: number }[] }) {
  const max = Math.max(1, ...filas.map((f) => f.horas));
  return (
    <div className="card">
      <h2 className="mb-3 font-display font-semibold text-navy-900">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="text-sm text-navy-400">Sin horas en el periodo.</p>
      ) : (
        <ul className="space-y-2.5">
          {filas.map((f, i) => (
            <li key={f.nombre}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="truncate font-medium text-navy-800">{f.nombre}</span>
                <span className="font-semibold tabular-nums text-navy-900">{f.horas.toFixed(1)} h</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-navy-100">
                <motion.div
                  className="h-full rounded-full bg-navy-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(f.horas / max) * 100}%` }}
                  transition={{ delay: i * 0.04, duration: 0.6 }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AsistenciaClient({ puedeEditar }: { puedeEditar: boolean }) {
  const [periodo, setPeriodo] = useState("hoy");
  const { datos, cargando, recargar, actualizando } = usePolling<Datos>(`/api/asistencia?periodo=${periodo}`, 30000);
  const [editando, setEditando] = useState<Fila | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  if (cargando && !datos) return <SkeletonPagina />;
  if (!datos) return null;

  return (
    <div className="carga-suave space-y-6" aria-busy={actualizando}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">🕒 Asistencia y horas</h1>
          <p className="text-sm text-navy-500">
            Jornadas de inspectores por pieza. Las inspecciones marcadas &ldquo;por hora&rdquo; se facturan con estas horas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-navy-200 bg-white p-1">
            {PERIODOS.map((p) => (
              <button
                key={p.valor}
                onClick={() => setPeriodo(p.valor)}
                className={`relative rounded-full px-3.5 py-1.5 text-sm font-semibold ${periodo === p.valor ? "text-white" : "text-navy-500"}`}
              >
                {periodo === p.valor && <motion.span layoutId="periodo-asistencia" className="absolute inset-0 rounded-full bg-navy" />}
                <span className="relative">{p.etiqueta}</span>
              </button>
            ))}
          </div>
          <a className="btn-secondary" href={`/api/asistencia/csv?periodo=${periodo}`}>
            ⬇️ CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi etiqueta="En planta ahora" valor={datos.enPlanta.length} />
        <Kpi etiqueta="Horas del periodo" valor={datos.totalHoras} decimales={1} indice={1} />
        <Kpi etiqueta="Inspectores con horas" valor={datos.porInspector.length} indice={2} />
        <Kpi etiqueta="Por revisar" valor={datos.porRevisar} alerta={datos.porRevisar > 0} indice={3} />
      </div>

      <div className="card">
        <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-navy-900">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          En planta ahora
        </h2>
        {datos.enPlanta.length === 0 ? (
          <p className="text-sm text-navy-400">Nadie tiene jornada abierta.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {datos.enPlanta.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"
              >
                <p className="font-semibold text-navy-900">{f.usuario.nombre}</p>
                <p className="truncate text-xs text-navy-500">
                  {f.inspeccion ? `${f.inspeccion.numeroParte ?? f.inspeccion.nombre} · ${f.inspeccion.cliente ?? "—"}` : "Sin pieza"}
                </p>
                <p className="mt-1 font-display text-lg font-bold text-emerald-700">
                  {duracionTexto(ahora - new Date(f.entrada).getTime())}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Barras titulo="Horas por cliente" filas={datos.porCliente} />
        <Barras titulo="Horas por inspector" filas={datos.porInspector} />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase text-navy-500">
            <tr>
              <th className="px-4 py-3">Inspector</th>
              <th className="px-4 py-3">Pieza / cliente</th>
              <th className="px-4 py-3">Entrada</th>
              <th className="px-4 py-3">Salida</th>
              <th className="px-4 py-3 text-right">Horas</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {datos.filas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-navy-400">
                  Sin jornadas en el periodo.
                </td>
              </tr>
            )}
            {datos.filas.map((f) => (
              <tr key={f.id} className={f.cerradaAuto ? "bg-amber-50" : ""}>
                <td className="px-4 py-2.5 font-medium text-navy-900">{f.usuario.nombre}</td>
                <td className="px-4 py-2.5 text-navy-600">
                  {f.inspeccion ? (
                    <Link href={`/inspecciones/${f.inspeccion.id}`} className="hover:underline">
                      {f.inspeccion.numeroParte ?? f.inspeccion.nombre}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {f.inspeccion?.cliente ? ` · ${f.inspeccion.cliente}` : ""}
                  {f.inspeccion?.modoCobro === "hora" && <span className="badge ml-1 bg-navy-100 text-navy-700">por hora</span>}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-navy-700">{hora(f.entrada)}</td>
                <td className="px-4 py-2.5 tabular-nums text-navy-700">
                  {f.salida ? hora(f.salida) : <span className="font-semibold text-emerald-700">En curso</span>}
                  {f.cerradaAuto && <span className="badge ml-1 bg-amber-100 text-amber-800">⚠️ Cerrada sola</span>}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{f.horas.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right">
                  {puedeEditar && (
                    <button className="text-xs font-semibold text-navy-500 hover:text-navy-900" onClick={() => setEditando(f)}>
                      Corregir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal abierto={Boolean(editando)} onCerrar={() => setEditando(null)} ancho="max-w-md">
        {editando && (
          <Correccion
            fila={editando}
            onCerrar={() => setEditando(null)}
            onGuardado={() => {
              setEditando(null);
              recargar();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function Correccion({ fila, onCerrar, onGuardado }: { fila: Fila; onCerrar: () => void; onGuardado: () => void }) {
  const toast = useToast();
  const [entrada, setEntrada] = useState(aLocal(fila.entrada));
  const [salida, setSalida] = useState(fila.salida ? aLocal(fila.salida) : "");
  const [nota, setNota] = useState(fila.nota ?? "");
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const res = await fetch(`/api/asistencia/${fila.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entrada: new Date(entrada).toISOString(),
        salida: salida ? new Date(salida).toISOString() : null,
        nota: nota || null,
      }),
    });
    setEnviando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo guardar");
      return;
    }
    toast.exito("Jornada corregida");
    onGuardado();
  }

  return (
    <form onSubmit={guardar} className="space-y-3 rounded-2xl bg-white p-5 shadow-2xl">
      <h2 className="font-display text-lg font-bold text-navy-900">Corregir jornada de {fila.usuario.nombre}</h2>
      {fila.cerradaAuto && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          El sistema la cerró con la hora de su última captura porque quedó abierta más de 14 horas. Ajusta la salida real.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Entrada</label>
          <input className="input" type="datetime-local" required value={entrada} onChange={(e) => setEntrada(e.target.value)} />
        </div>
        <div>
          <label className="label">Salida</label>
          <input className="input" type="datetime-local" value={salida} onChange={(e) => setSalida(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Nota (opcional)</label>
        <input className="input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Olvidó checar salida, confirmó su líder" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
