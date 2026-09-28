"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePolling } from "@/lib/usePolling";
import { DEFECTOS_COMUNES, ESTADOS_INSPECTOR, PLANTAS } from "@/lib/constants";
import SubidaPdf from "@/components/SubidaPdf";
import CampoCobro from "@/components/CampoCobro";
import CompartirInspeccion from "@/components/CompartirInspeccion";
import Reportes8DCard from "@/components/Reportes8DCard";
import SpcCard from "@/components/SpcCard";
import JornadaBarra from "@/components/JornadaBarra";
import GaleriaDefectos, { type FotoDefecto } from "@/components/GaleriaDefectos";
import ClienteSelect from "@/components/ClienteSelect";
import SelectorInspectores from "@/components/SelectorInspectores";
import { useModoInmersivo } from "@/components/AppShell";
import { AnimatePresence, motion } from "framer-motion";
import Modal from "@/components/ui/Modal";
import NumeroAnimado from "@/components/ui/NumeroAnimado";
import { Skeleton, SkeletonKpis } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { vibrar, flashPantalla } from "@/lib/feedback";
import { comprimirImagen } from "@/lib/imagen";
import {
  enviarCaptura,
  quitarDeCola,
  useColaCapturas,
  type ResultadoEnvio,
} from "@/lib/colaCapturas";

type SesionUsuario = {
  id: string;
  nombre: string;
  rol: "ADMIN" | "SUPERVISOR" | "GERENTE" | "LIDER" | "INSPECTOR" | "RESIDENTE" | "CLIENTE";
};

type Inspeccion = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  cliente: string | null;
  planta: string | null;
  creadoEn: string;
  meta: number;
  precioPorPieza: number;
  modoCobro: string;
  precioPorHora: number;
  fechaEntrega: string | null;
  instrucciones: string | null;
  instruccionesPdfUrl: string | null;
  piezasBuenas: number;
  piezasMalas: number;
  piezasRetrabajadas: number;
  cerrado: boolean;
  cerradoPor: string | null;
  cerradoEn: string | null;
  inspectores: { usuario: { id: string; nombre: string } }[];
  defectos: { tipo: string; cantidad: number; recuperadas: number }[];
  puntoLimpio: string | null;
  puntoLimpioFotoUrl: string | null;
  puntoLimpioReportadoPor: string | null;
  puntoLimpioReportadoEn: string | null;
  puntoLimpioOk: boolean;
  puntoLimpioOkPor: string | null;
  puntoLimpioOkEn: string | null;
};

export default function InspeccionDetalleClient({
  id,
  sesion,
}: {
  id: string;
  sesion: SesionUsuario;
}) {
  const router = useRouter();
  const { datos: inspeccion, cargando, recargar } = usePolling<Inspeccion>(
    `/api/inspecciones/${id}`,
    6000
  );
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [mostrarEditar, setMostrarEditar] = useState(false);

  const asignado = inspeccion?.inspectores.some((a) => a.usuario.id === sesion.id) ?? false;
  // Solo el rol Inspector captura piezas; los demás roles ven la inspección en modo lectura.
  const puedeCapturar = !inspeccion?.cerrado && sesion.rol === "INSPECTOR" && asignado;
  const puedeGestionar = sesion.rol === "ADMIN" || sesion.rol === "SUPERVISOR";

  if (cargando || !inspeccion) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <SkeletonKpis />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (sesion.rol === "INSPECTOR") {
    return (
      <VistaInspectorJuego
        id={id}
        inspeccion={inspeccion}
        puedeCapturar={puedeCapturar}
        asignado={asignado}
        recargar={recargar}
        nombre={sesion.nombre}
      />
    );
  }

  const total = inspeccion.piezasBuenas + inspeccion.piezasMalas;
  const rechazo = total > 0 ? inspeccion.piezasMalas / total : 0;
  const progreso = inspeccion.meta > 0 ? Math.min(100, (total / inspeccion.meta) * 100) : 0;

  const datosPareto = [...inspeccion.defectos]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 8)
    .map((d) => ({ tipo: d.tipo, cantidad: d.cantidad }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => router.push("/inspecciones")}
            className="mb-1 text-xs font-semibold text-navy-400 hover:text-navy-700"
          >
            ← Inspecciones
          </button>
          <h1 className="font-display text-2xl font-bold text-navy-900">{inspeccion.nombre}</h1>
          <p className="text-sm text-navy-500">
            {inspeccion.numeroParte ?? "Sin número de parte"} · {inspeccion.planta ?? "Sin planta"}
            {inspeccion.cliente ? ` · Cliente: ${inspeccion.cliente}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`badge ${inspeccion.cerrado ? "bg-navy-100 text-navy-500" : "bg-green-100 text-green-800"}`}
          >
            {inspeccion.cerrado ? "Cerrada" : "Activa"}
          </span>
          {inspeccion.cerrado && (
            <a href={`/api/inspecciones/${id}/reporte`} target="_blank" className="btn-secondary">
              Descargar PDF
            </a>
          )}
          <a href={`/api/inspecciones/${id}/csv`} className="btn-secondary">
            Exportar CSV
          </a>
          <a href={`/inspecciones/${id}/liberacion`} className="btn-secondary">
            ✅ {sesion.rol === "CLIENTE" ? "Material liberado" : "Liberar material"}
          </a>
          {puedeGestionar && (
            <a href={`/inspecciones/${id}/etiqueta`} className="btn-secondary">
              🏷️ Etiqueta QR
            </a>
          )}
          {sesion.rol !== "RESIDENTE" && (
            <CompartirInspeccion inspeccionId={id} nombre={inspeccion.numeroParte ?? inspeccion.nombre} />
          )}
          {puedeGestionar && !inspeccion.cerrado && (
            <button className="btn-secondary" onClick={() => setMostrarEditar(true)}>
              Editar
            </button>
          )}
          {puedeGestionar && !inspeccion.cerrado && (
            <button className="btn-accent" onClick={() => setMostrarCierre(true)}>
              Cerrar inspección
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metrica etiqueta="Piezas buenas" valor={<NumeroAnimado valor={inspeccion.piezasBuenas} />} />
        <Metrica etiqueta="Piezas malas" valor={<NumeroAnimado valor={inspeccion.piezasMalas} />} />
        <Metrica etiqueta="🔧 Recuperadas" valor={<NumeroAnimado valor={inspeccion.piezasRetrabajadas} />} />
        <Metrica
          etiqueta="NG final (scrap)"
          valor={<NumeroAnimado valor={inspeccion.piezasMalas - inspeccion.piezasRetrabajadas} />}
        />
        <Metrica
          etiqueta="% Rechazo"
          valor={<NumeroAnimado valor={rechazo * 100} formato={(n) => `${n.toFixed(1)}%`} />}
          alerta={rechazo >= 0.08}
        />
        <PuntoLimpioMetrica
          inspeccion={inspeccion}
          puedeEditar={puedeGestionar && !inspeccion.cerrado}
          inspeccionId={id}
          onActualizado={recargar}
        />
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-navy-100">
        <motion.div
          className="h-2 rounded-full bg-gradient-to-r from-yellow to-amber-500"
          initial={{ width: 0 }}
          animate={{ width: `${progreso}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {(inspeccion.instrucciones || inspeccion.instruccionesPdfUrl) && (
        <div className="card">
          <h2 className="mb-1 font-display font-semibold text-navy-900">
            Instrucción de trabajo / criterio de aceptación
          </h2>
          {inspeccion.instrucciones && (
            <p className="whitespace-pre-wrap text-sm text-navy-600">{inspeccion.instrucciones}</p>
          )}
          {inspeccion.instruccionesPdfUrl && (
            <a
              href={inspeccion.instruccionesPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-navy underline"
            >
              Ver PDF de instrucción de trabajo
            </a>
          )}
        </div>
      )}

      <div className="card">
        <h2 className="mb-3 font-display font-semibold text-navy-900">Pareto de defectos</h2>
        {datosPareto.length === 0 ? (
          <p className="text-sm text-navy-400">Todavía no se han registrado defectos.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={datosPareto} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="tipo" width={160} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#142B6B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <SpcCard inspeccionId={id} />

      <GaleriaCard inspeccionId={id} />

      <Reportes8DCard
        inspeccionId={id}
        defectos={datosPareto}
        puedeCrear={["ADMIN", "SUPERVISOR", "GERENTE", "LIDER"].includes(sesion.rol)}
      />

      {inspeccion.inspectores.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-display font-semibold text-navy-900">Inspectores asignados</h2>
          <div className="flex flex-wrap gap-2">
            {inspeccion.inspectores.map((a) => (
              <span key={a.usuario.id} className="badge bg-navy-50 text-navy-700">
                {a.usuario.nombre}
              </span>
            ))}
          </div>
        </div>
      )}

      {inspeccion.cerrado && (
        <div className="card bg-navy-50">
          <p className="text-sm text-navy-700">
            Cerrada por <strong>{inspeccion.cerradoPor}</strong> el{" "}
            {inspeccion.cerradoEn && new Date(inspeccion.cerradoEn).toLocaleString("es-MX")}
          </p>
        </div>
      )}

      <Modal abierto={mostrarCierre} onCerrar={() => setMostrarCierre(false)} ancho="max-w-sm">
        <CierreModal
          inspeccionId={id}
          nombreSugerido={sesion.nombre}
          onCerrar={() => setMostrarCierre(false)}
          onCerrado={() => {
            setMostrarCierre(false);
            recargar();
          }}
        />
      </Modal>

      <Modal abierto={mostrarEditar} onCerrar={() => setMostrarEditar(false)}>
        <EditarModal
          inspeccionId={id}
          inspeccion={inspeccion}
          onCerrar={() => setMostrarEditar(false)}
          onGuardado={() => {
            setMostrarEditar(false);
            recargar();
          }}
        />
      </Modal>
    </div>
  );
}

function GaleriaCard({ inspeccionId }: { inspeccionId: string }) {
  const { datos } = usePolling<
    { id: string; fotoUrl: string; defecto: string | null; malas: number; creadoEn: string; usuario?: { nombre: string } }[]
  >(`/api/inspecciones/${inspeccionId}/galeria`, 30000);

  const fotos: FotoDefecto[] = (datos ?? []).map((f) => ({
    id: f.id,
    url: f.fotoUrl,
    defecto: f.defecto,
    cantidad: f.malas,
    creadoEn: f.creadoEn,
    autor: f.usuario?.nombre,
  }));

  return (
    <div className="card">
      <h2 className="mb-3 font-display font-semibold text-navy-900">
        📸 Evidencia de defectos {fotos.length > 0 && <span className="text-navy-400">({fotos.length})</span>}
      </h2>
      {datos === null ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-xl" />
          ))}
        </div>
      ) : (
        <GaleriaDefectos fotos={fotos} />
      )}
    </div>
  );
}

function VistaInspectorJuego({
  id,
  inspeccion,
  puedeCapturar,
  asignado,
  recargar,
  nombre,
}: {
  id: string;
  inspeccion: Inspeccion;
  puedeCapturar: boolean;
  asignado: boolean;
  recargar: () => void;
  nombre: string;
}) {
  const router = useRouter();
  const [racha, setRacha] = useState(0);
  useModoInmersivo(!inspeccion.cerrado);
  const cola = useColaCapturas(id);
  const pendientesCola = cola.pendientes;
  useEffect(() => {
    // al vaciarse la cola, refrescar para que los contadores del servidor ya incluyan lo sincronizado
    recargar();
  }, [pendientesCola, recargar]);
  const buenasVista = inspeccion.piezasBuenas + cola.pendientesBuenas;
  const malasVista = inspeccion.piezasMalas + cola.pendientesMalas;

  const total = inspeccion.piezasBuenas + inspeccion.piezasMalas;
  const rechazo = total > 0 ? inspeccion.piezasMalas / total : 0;
  const progreso = inspeccion.meta > 0 ? Math.min(100, (total / inspeccion.meta) * 100) : 0;
  const horasTranscurridas = Math.max(
    (Date.now() - new Date(inspeccion.creadoEn).getTime()) / 3600000,
    1 / 60
  );
  const piezasPorHora = total / horasTranscurridas;
  const datosPareto = [...inspeccion.defectos]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 8)
    .map((d) => ({ tipo: d.tipo, cantidad: d.cantidad }));

  function manejarResultado(esBuena: boolean, cantidad: number) {
    setRacha((r) => (esBuena ? r + cantidad : 0));
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {inspeccion.cerrado && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/estacion")}
            className="text-xs font-semibold text-navy-400 hover:text-navy-700"
          >
            ← Mis inspecciones
          </button>
        </div>
      )}

      <div className="card overflow-hidden border-none bg-gradient-to-br from-navy-800 to-navy-900 text-white shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow">
              {inspeccion.planta ?? "Pieza"}
            </p>
            <h1 className="font-display text-2xl font-bold">
              {inspeccion.numeroParte ?? inspeccion.nombre}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {asignado && !inspeccion.cerrado && <EstadoInspectorChip />}
            <AnimatePresence>
              {racha >= 3 && (
                <motion.span
                  key="racha"
                  initial={{ scale: 0, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="badge bg-yellow text-navy-900 shadow-[0_0_18px_rgba(244,217,53,0.6)]"
                >
                  🔥 Racha x{racha}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-white/10 py-4">
            <p className="font-display text-5xl font-extrabold text-green-400">
              <NumeroAnimado valor={buenasVista} duracion={0.5} />
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">
              ✅ Buenas
            </p>
          </div>
          <div className="rounded-xl bg-white/10 py-4">
            <p className="font-display text-5xl font-extrabold text-red-400">
              <NumeroAnimado valor={malasVista} duracion={0.5} />
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">
              ❌ Malas
            </p>
          </div>
        </div>

        {inspeccion.piezasRetrabajadas > 0 && (
          <p className="mt-2 text-center text-xs font-semibold text-amber-200">
            🔧 {inspeccion.piezasRetrabajadas} recuperada{inspeccion.piezasRetrabajadas === 1 ? "" : "s"} con retrabajo ·
            NG final {inspeccion.piezasMalas - inspeccion.piezasRetrabajadas}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between rounded-xl bg-white/10 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
            ⚡ Ritmo
          </span>
          <span className="font-display text-xl font-extrabold text-yellow">
            <NumeroAnimado valor={piezasPorHora} decimales={1} />{" "}
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
              pzas/hora
            </span>
          </span>
        </div>
      </div>

      {puedeCapturar && <JornadaBarra inspeccionId={id} />}

      <AnimatePresence>
        {puedeCapturar && (!cola.enLinea || cola.pendientes > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
              cola.enLinea ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-900"
            }`}
          >
            <span className="text-lg">{cola.enLinea ? "🔄" : "📡"}</span>
            {cola.enLinea
              ? `Sincronizando ${cola.pendientes} captura${cola.pendientes === 1 ? "" : "s"}…`
              : `Sin conexión. Tus capturas se guardan en el equipo${
                  cola.pendientes > 0 ? ` (${cola.pendientes} pendiente${cola.pendientes === 1 ? "" : "s"})` : ""
                } y se envían solas al volver la señal.`}
          </motion.div>
        )}
      </AnimatePresence>

      {puedeCapturar && (
        <CapturaPanel
          inspeccionId={id}
          onCapturado={recargar}
          mostrarExtras
          onResultado={manejarResultado}
          onDeshecho={() => setRacha(0)}
          defectos={inspeccion.defectos}
        />
      )}

      {(inspeccion.instrucciones || inspeccion.instruccionesPdfUrl) && (
        <details className="card">
          <summary className="cursor-pointer font-display font-semibold text-navy-900">
            Ver criterio de aceptación
          </summary>
          {inspeccion.instrucciones && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-navy-600">
              {inspeccion.instrucciones}
            </p>
          )}
          {inspeccion.instruccionesPdfUrl && (
            <a
              href={inspeccion.instruccionesPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-navy underline"
            >
              Ver PDF de instrucción de trabajo
            </a>
          )}
        </details>
      )}

      {puedeCapturar && <PuntoLimpioPanel inspeccion={inspeccion} onActualizado={recargar} />}

      {inspeccion.cerrado && (
        <div className="space-y-4">
          <div className="card overflow-hidden border-none bg-gradient-to-br from-yellow via-amber-400 to-yellow-600 text-navy-900 shadow-lg">
            <p className="text-center text-4xl">🎉🏁🎉</p>
            <h2 className="mt-2 text-center font-display text-2xl font-extrabold">
              ¡Gracias por tu trabajo, {nombre.split(" ")[0]}!
            </h2>
            <p className="mt-1 text-center text-sm font-semibold text-navy-800/80">
              Este sorteo quedó cerrado. Así quedaron tus números:
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-white/50 py-4">
                <p className="font-display text-4xl font-extrabold text-green-800">
                  {inspeccion.piezasBuenas}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-navy-800/70">
                  ✅ Buenas
                </p>
              </div>
              <div className="rounded-xl bg-white/50 py-4">
                <p className="font-display text-4xl font-extrabold text-red-700">
                  {inspeccion.piezasMalas}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-navy-800/70">
                  ❌ Malas
                </p>
              </div>
              <div className="rounded-xl bg-white/50 py-4">
                <p className="font-display text-3xl font-extrabold text-navy-900">
                  {(100 - rechazo * 100).toFixed(1)}%
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-navy-800/70">
                  🎯 Calidad
                </p>
              </div>
              <div className="rounded-xl bg-white/50 py-4">
                <p className="font-display text-3xl font-extrabold text-navy-900">
                  {inspeccion.meta > 0 ? `${progreso.toFixed(0)}%` : "—"}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-navy-800/70">
                  📈 Meta
                </p>
              </div>
            </div>

            <p className="mt-5 text-center font-display text-lg font-bold text-navy-900">
              {rechazo < 0.02
                ? "🏆 ¡Desempeño excelente!"
                : rechazo < 0.08
                  ? "🥈 ¡Buen trabajo!"
                  : "💪 ¡Sigue mejorando, tú puedes!"}
            </p>
          </div>

          <div className="card">
            <h2 className="mb-3 font-display font-semibold text-navy-900">Pareto de defectos</h2>
            {datosPareto.length === 0 ? (
              <p className="text-sm text-navy-400">No se registraron defectos.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={datosPareto} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="tipo" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#142B6B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {inspeccion.cerradoPor && (
            <div className="card bg-navy-50">
              <p className="text-sm text-navy-700">
                Cerrada por <strong>{inspeccion.cerradoPor}</strong> el{" "}
                {inspeccion.cerradoEn && new Date(inspeccion.cerradoEn).toLocaleString("es-MX")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metrica({
  etiqueta,
  valor,
  alerta,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  alerta?: boolean;
}) {
  return (
    <div className={`card ${alerta ? "animate-respirar border-red-300 bg-red-50" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">{etiqueta}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${alerta ? "text-red-700" : "text-navy-900"}`}>
        {valor}
      </p>
    </div>
  );
}

function PuntoLimpioMetrica({
  inspeccion,
  puedeEditar,
  inspeccionId,
  onActualizado,
}: {
  inspeccion: Inspeccion;
  puedeEditar: boolean;
  inspeccionId: string;
  onActualizado: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(inspeccion.puntoLimpio ?? "");
  const [guardando, setGuardando] = useState(false);

  const estado = inspeccion.puntoLimpioOk
    ? { texto: "✅ Verificado", color: "text-green-700" }
    : inspeccion.puntoLimpioFotoUrl
      ? { texto: "🟡 Pendiente OK", color: "text-amber-600" }
      : { texto: "— Sin reportar", color: "text-navy-400" };

  async function guardar() {
    setGuardando(true);
    const res = await fetch(`/api/inspecciones/${inspeccionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puntoLimpio: valor.trim() || null }),
    });
    setGuardando(false);
    if (res.ok) {
      setEditando(false);
      onActualizado();
    }
  }

  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">🧼 Punto Limpio</p>
      {editando ? (
        <div className="mt-1 space-y-2">
          <input
            className="input text-sm"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ej. Lote 4521"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="btn-primary flex-1 py-1 text-xs"
            >
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditando(false);
                setValor(inspeccion.puntoLimpio ?? "");
              }}
              className="btn-secondary py-1 text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : puedeEditar ? (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="mt-1 block text-left"
        >
          <span className="font-display text-lg font-bold text-navy-900">
            {inspeccion.puntoLimpio || "Sin identificar"}
          </span>
          <span className="ml-1.5 text-xs font-semibold text-navy-400">✏️</span>
        </button>
      ) : (
        <p className="mt-1 font-display text-lg font-bold text-navy-900">
          {inspeccion.puntoLimpio || "Sin identificar"}
        </p>
      )}
      <p className={`text-xs font-semibold ${estado.color}`}>{estado.texto}</p>
      {inspeccion.puntoLimpioFotoUrl && (
        <a
          href={inspeccion.puntoLimpioFotoUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs font-semibold text-navy underline"
        >
          Ver evidencia
        </a>
      )}
    </div>
  );
}

function PuntoLimpioPanel({
  inspeccion,
  onActualizado,
}: {
  inspeccion: Inspeccion;
  onActualizado: () => void;
}) {
  const [foto, setFoto] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reportarFoto(e: React.FormEvent) {
    e.preventDefault();
    if (!foto) return;
    setEnviando(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("foto", await comprimirImagen(foto));
      const resFoto = await fetch("/api/upload", { method: "POST", body: form });
      if (!resFoto.ok) {
        const d = await resFoto.json().catch(() => ({}));
        setError(d.error ?? "No se pudo subir la foto");
        return;
      }
      const { url } = await resFoto.json();

      const res = await fetch(`/api/inspecciones/${inspeccion.id}/punto-limpio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoUrl: url }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo reportar el Punto Limpio");
        return;
      }
      setFoto(null);
      onActualizado();
    } catch {
      setError("Sin conexión. Revisa tu señal e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarOk() {
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/inspecciones/${inspeccion.id}/punto-limpio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo confirmar el Punto Limpio");
      return;
    }
    onActualizado();
  }

  return (
    <div className="card">
      <h2 className="mb-2 font-display font-semibold text-navy-900">
        🧼 Punto Limpio{inspeccion.puntoLimpio ? `: ${inspeccion.puntoLimpio}` : ""}
      </h2>

      {inspeccion.puntoLimpioOk ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-green-700">
            ✅ Verificado por {inspeccion.puntoLimpioOkPor}
            {inspeccion.puntoLimpioOkEn &&
              ` el ${new Date(inspeccion.puntoLimpioOkEn).toLocaleString("es-MX")}`}
          </p>
          {inspeccion.puntoLimpioFotoUrl && (
            <a
              href={inspeccion.puntoLimpioFotoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-navy underline"
            >
              Ver evidencia
            </a>
          )}
        </div>
      ) : inspeccion.puntoLimpioFotoUrl ? (
        <div className="space-y-3">
          <p className="text-sm text-navy-600">
            Evidencia enviada por {inspeccion.puntoLimpioReportadoPor}. Confirma que el material
            certificado llegó correctamente.
          </p>
          <a
            href={inspeccion.puntoLimpioFotoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs font-semibold text-navy underline"
          >
            Ver foto enviada
          </a>
          <button
            type="button"
            onClick={confirmarOk}
            disabled={enviando}
            className="w-full rounded-lg bg-green-600 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-40"
          >
            {enviando ? "Confirmando…" : "✅ Punto limpio OK"}
          </button>
        </div>
      ) : (
        <form onSubmit={reportarFoto} className="space-y-2">
          <p className="text-sm text-navy-600">
            Sube una foto como evidencia de que llegó el material ya certificado/bueno del
            proveedor.
          </p>
          <input
            className="input text-xs"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
          />
          <button
            type="submit"
            disabled={enviando || !foto}
            className="w-full rounded-lg bg-navy py-2 text-sm font-bold text-white transition hover:bg-navy-600 disabled:opacity-40"
          >
            {enviando ? "Enviando…" : "📸 Reportar Punto Limpio"}
          </button>
        </form>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function ContadorPiezas({
  cantidad,
  onCambiar,
  disabled,
  colorTexto,
}: {
  cantidad: number;
  onCambiar: (nuevo: number) => void;
  disabled?: boolean;
  colorTexto: string;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      {[-10, -1].map((paso) => (
        <button
          key={paso}
          type="button"
          disabled={disabled}
          onClick={() => {
            vibrar("toque");
            onCambiar(Math.max(0, cantidad + paso));
          }}
          className="flex h-10 min-w-[2.75rem] items-center justify-center rounded-lg border border-navy-200 bg-white px-2 text-sm font-bold text-navy-700 transition hover:bg-navy-50 active:scale-90 disabled:opacity-40"
        >
          {paso}
        </button>
      ))}
      <motion.span
        key={cantidad}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 600, damping: 20 }}
        className={`mx-1 w-14 text-center font-display text-2xl font-extrabold ${colorTexto}`}
      >
        {cantidad}
      </motion.span>
      {[1, 10, 100].map((paso) => (
        <button
          key={paso}
          type="button"
          disabled={disabled}
          onClick={() => {
            vibrar("toque");
            onCambiar(cantidad + paso);
          }}
          className="flex h-10 min-w-[2.75rem] items-center justify-center rounded-lg border border-navy-200 bg-white px-2 text-sm font-bold text-navy-700 transition hover:bg-navy-50 active:scale-90 disabled:opacity-40"
        >
          +{paso}
        </button>
      ))}
    </div>
  );
}

function CapturaPanel({
  inspeccionId,
  onCapturado,
  mostrarExtras,
  onResultado,
  onDeshecho,
  defectos = [],
}: {
  inspeccionId: string;
  onCapturado: () => void;
  mostrarExtras: boolean;
  onResultado?: (esBuena: boolean, cantidad: number) => void;
  onDeshecho?: () => void;
  defectos?: { tipo: string; cantidad: number; recuperadas: number }[];
}) {
  const toast = useToast();
  const [cantidadBuena, setCantidadBuena] = useState(0);
  const [cantidadMala, setCantidadMala] = useState(1);
  const [defecto, setDefecto] = useState<string>(DEFECTOS_COMUNES[0]);
  const [foto, setFoto] = useState<File | null>(null);
  const [enviandoBuena, setEnviandoBuena] = useState(false);
  const [enviandoMala, setEnviandoMala] = useState(false);
  const [mostrarFormDefecto, setMostrarFormDefecto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [estacion, setEstacion] = useState<string | null>(null);
  const [hoy, setHoy] = useState<{ buenas: number; malas: number } | null>(null);
  const [llamandoApoyo, setLlamandoApoyo] = useState(false);
  const [apoyoAvisado, setApoyoAvisado] = useState(false);
  const [popBuena, setPopBuena] = useState<number | null>(null);
  const [popMala, setPopMala] = useState<number | null>(null);

  const cargarHoy = useCallback(() => {
    if (!mostrarExtras) return;
    fetch(`/api/inspecciones/${inspeccionId}/hoy`)
      .then((r) => r.json())
      .then(setHoy)
      .catch(() => {});
  }, [inspeccionId, mostrarExtras]);

  useEffect(() => {
    if (!mostrarExtras) return;
    fetch("/api/estado")
      .then((r) => r.json())
      .then((d) => setEstacion(d?.estacion ?? null))
      .catch(() => {});
    cargarHoy();
  }, [mostrarExtras, cargarHoy]);

  async function llamarApoyo() {
    setLlamandoApoyo(true);
    const res = await fetch("/api/apoyo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inspeccionId }),
    }).catch(() => null);
    setLlamandoApoyo(false);
    if (!res?.ok) {
      toast.error("No se pudo avisar a liderazgo. Revisa tu señal.");
      return;
    }
    vibrar("exito");
    toast.exito("Se avisó a liderazgo, ya va alguien para tu estación");
    setApoyoAvisado(true);
    setTimeout(() => setApoyoAvisado(false), 15000);
  }

  async function deshacer(resultado: ResultadoEnvio) {
    if (resultado.estado === "encolada") {
      quitarDeCola(resultado.idCliente);
    } else if (resultado.estado === "enviada") {
      const res = await fetch(`/api/inspecciones/${inspeccionId}/capturas/${resultado.capturaId}`, {
        method: "DELETE",
      }).catch(() => null);
      if (!res?.ok) {
        const d = await res?.json().catch(() => ({}));
        toast.error(d?.error ?? "No se pudo deshacer la captura");
        return;
      }
    }
    vibrar("toque");
    toast.info("Captura deshecha");
    onDeshecho?.();
    onCapturado();
    cargarHoy();
  }

  function confirmar(resultado: ResultadoEnvio, mensaje: string) {
    const texto =
      resultado.estado === "encolada" ? `${mensaje} · sin señal, se enviará al reconectar` : mensaje;
    toast.exito(texto, {
      duracion: 5000,
      accion: { etiqueta: "Deshacer", onClick: () => deshacer(resultado) },
    });
  }

  async function registrarBuenas() {
    if (cantidadBuena <= 0) return;
    setEnviandoBuena(true);
    const cantidad = cantidadBuena;
    const resultado = await enviarCaptura(inspeccionId, { tipo: "buena", cantidad });
    setEnviandoBuena(false);
    if (resultado.estado === "error") {
      vibrar("error");
      toast.error(resultado.mensaje);
      return;
    }
    vibrar("exito");
    flashPantalla("exito");
    confirmar(resultado, `+${cantidad} pieza${cantidad === 1 ? "" : "s"} registrada${cantidad === 1 ? "" : "s"}`);
    onCapturado();
    cargarHoy();
    onResultado?.(true, cantidad);
    setPopBuena(cantidad);
    setTimeout(() => setPopBuena(null), 900);
    setCantidadBuena(0);
  }

  async function registrarMalas(e: React.FormEvent) {
    e.preventDefault();
    if (cantidadMala <= 0) return;
    setEnviandoMala(true);
    const cantidad = cantidadMala;
    const resultado = await enviarCaptura(inspeccionId, { tipo: "mala", cantidad, defecto }, foto);
    setEnviandoMala(false);
    if (resultado.estado === "error") {
      vibrar("error");
      toast.error(resultado.mensaje);
      return;
    }
    vibrar("error");
    flashPantalla("error");
    confirmar(resultado, `${cantidad} defecto${cantidad === 1 ? "" : "s"} reportado${cantidad === 1 ? "" : "s"}: ${defecto}`);
    if (resultado.estado === "enviada" && resultado.avisoFoto) {
      toast.error(`El defecto quedó registrado, pero sin foto: ${resultado.avisoFoto}`, { duracion: 8000 });
    }
    setFoto(null);
    if (inputRef.current) inputRef.current.value = "";
    onCapturado();
    cargarHoy();
    onResultado?.(false, cantidad);
    setPopMala(cantidad);
    setTimeout(() => setPopMala(null), 900);
    setCantidadMala(1);
    setMostrarFormDefecto(false);
  }

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-semibold text-navy-900">Captura</h2>
        {mostrarExtras && (
          <div className="flex flex-wrap items-center gap-2">
            {estacion && <span className="badge bg-navy-50 text-navy-700">📍 {estacion}</span>}
            {hoy && (
              <span
                className={`badge ${hoy.malas > 0 ? "bg-red-50 text-red-700" : "bg-navy-50 text-navy-700"}`}
              >
                {hoy.malas} defecto{hoy.malas === 1 ? "" : "s"} hoy
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="relative rounded-xl border border-green-200 bg-green-50 p-3">
          {popBuena !== null && (
            <span className="animate-pop-plus pointer-events-none absolute inset-x-0 top-1 text-center text-xl font-extrabold text-green-600">
              +{popBuena}
            </span>
          )}
          <p className="mb-2 text-center text-sm font-semibold text-green-800">
            📦 Cantidad inspeccionada
          </p>
          <ContadorPiezas
            cantidad={cantidadBuena}
            onCambiar={setCantidadBuena}
            disabled={enviandoBuena}
            colorTexto="text-green-700"
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={registrarBuenas}
            disabled={enviandoBuena || cantidadBuena <= 0}
            className="mt-3 w-full rounded-lg bg-green-600 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-40"
          >
            {enviandoBuena
              ? "Guardando…"
              : `Registrar ${cantidadBuena || ""} pieza${cantidadBuena === 1 ? "" : "s"} inspeccionada${cantidadBuena === 1 ? "" : "s"}`}
          </motion.button>
        </div>

        <div className="relative rounded-xl border border-red-200 bg-red-50 p-3">
          {popMala !== null && (
            <span className="animate-pop-plus pointer-events-none absolute inset-x-0 top-1 text-center text-xl font-extrabold text-red-600">
              +{popMala}
            </span>
          )}
          <AnimatePresence mode="wait" initial={false}>
            {!mostrarFormDefecto ? (
              <motion.button
                key="abrir"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  vibrar("toque");
                  setMostrarFormDefecto(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700"
              >
                ⚠️ Reportar defecto
              </motion.button>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-red-800">⚠️ Reportar defecto</p>
                  <button
                    type="button"
                    onClick={() => setMostrarFormDefecto(false)}
                    className="text-xs font-semibold text-red-400 hover:text-red-700"
                  >
                    Cancelar
                  </button>
                </div>
                <ContadorPiezas
                  cantidad={cantidadMala}
                  onCambiar={setCantidadMala}
                  disabled={enviandoMala}
                  colorTexto="text-red-700"
                />
                <form onSubmit={registrarMalas} className="mt-3 space-y-2">
                  <select className="input" value={defecto} onChange={(e) => setDefecto(e.target.value)}>
                    {DEFECTOS_COMUNES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    ref={inputRef}
                    className="input text-xs"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                  />
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.96 }}
                    disabled={enviandoMala || cantidadMala <= 0}
                    className="w-full rounded-lg bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
                  >
                    {enviandoMala
                      ? "Guardando…"
                      : `Reportar ${cantidadMala || ""} defecto${cantidadMala === 1 ? "" : "s"}`}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <PanelRetrabajo
        inspeccionId={inspeccionId}
        defectos={defectos}
        onRegistrado={() => {
          onCapturado();
          cargarHoy();
        }}
        onDeshacer={deshacer}
      />

      {mostrarExtras && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={llamarApoyo}
          disabled={llamandoApoyo || apoyoAvisado}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-60"
        >
          {apoyoAvisado
            ? "✓ Se avisó a liderazgo"
            : llamandoApoyo
              ? "Avisando…"
              : "🔔 Llamar líder / supervisor"}
        </motion.button>
      )}
    </div>
  );
}

function PanelRetrabajo({
  inspeccionId,
  defectos,
  onRegistrado,
  onDeshacer,
}: {
  inspeccionId: string;
  defectos: { tipo: string; cantidad: number; recuperadas: number }[];
  onRegistrado: () => void;
  onDeshacer: (r: ResultadoEnvio) => void;
}) {
  const toast = useToast();
  const pendientes = defectos
    .map((d) => ({ tipo: d.tipo, pendientes: d.cantidad - d.recuperadas }))
    .filter((d) => d.pendientes > 0);
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<string>("");
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState(false);

  const elegido = pendientes.find((d) => d.tipo === tipo) ?? pendientes[0];
  const maximo = elegido?.pendientes ?? 0;

  if (pendientes.length === 0) return null;

  async function registrar() {
    if (!elegido || cantidad <= 0) return;
    setEnviando(true);
    const resultado = await enviarCaptura(inspeccionId, { tipo: "retrabajo", cantidad, defecto: elegido.tipo });
    setEnviando(false);
    if (resultado.estado === "error") {
      vibrar("error");
      toast.error(resultado.mensaje);
      return;
    }
    vibrar("exito");
    flashPantalla("exito");
    toast.exito(
      `🔧 ${cantidad} pieza${cantidad === 1 ? "" : "s"} recuperada${cantidad === 1 ? "" : "s"} (${elegido.tipo})${
        resultado.estado === "encolada" ? " · sin señal, se enviará al reconectar" : ""
      }`,
      { duracion: 5000, accion: { etiqueta: "Deshacer", onClick: () => onDeshacer(resultado) } }
    );
    setCantidad(1);
    setAbierto(false);
    onRegistrado();
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      {!abierto ? (
        <button
          type="button"
          onClick={() => {
            vibrar("toque");
            setAbierto(true);
          }}
          className="flex w-full items-center justify-between rounded-lg px-1 text-left text-sm font-bold text-amber-900"
        >
          <span>🔧 Retrabajo: recuperar piezas NG</span>
          <span className="badge bg-amber-200 text-amber-900">
            {pendientes.reduce((a, d) => a + d.pendientes, 0)} por recuperar
          </span>
        </button>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-900">🔧 Piezas recuperadas con retrabajo</p>
            <button type="button" onClick={() => setAbierto(false)} className="text-xs font-semibold text-amber-700">
              Cancelar
            </button>
          </div>
          <select
            className="input"
            value={elegido?.tipo ?? ""}
            onChange={(e) => {
              setTipo(e.target.value);
              setCantidad(1);
            }}
          >
            {pendientes.map((d) => (
              <option key={d.tipo} value={d.tipo}>
                {d.tipo} · {d.pendientes} por recuperar
              </option>
            ))}
          </select>
          <ContadorPiezas
            cantidad={cantidad}
            onCambiar={(n) => setCantidad(Math.min(maximo, Math.max(0, n)))}
            disabled={enviando}
            colorTexto="text-amber-700"
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={registrar}
            disabled={enviando || cantidad <= 0}
            className="w-full rounded-lg bg-amber-500 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-40"
          >
            {enviando ? "Guardando…" : `Registrar ${cantidad} recuperada${cantidad === 1 ? "" : "s"}`}
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}

function EstadoInspectorChip() {
  const [estado, setEstado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    fetch("/api/estado")
      .then((r) => r.json())
      .then((d) => setEstado(d?.estado ?? "activo"))
      .finally(() => setCargando(false));
  }, []);

  async function cambiar(valor: string) {
    setEstado(valor);
    setAbierto(false);
    await fetch("/api/estado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: valor }),
    });
  }

  if (cargando || !estado) return null;

  const actual = ESTADOS_INSPECTOR.find((e) => e.valor === estado) ?? ESTADOS_INSPECTOR[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={`Mi estado: ${actual.etiqueta.replace(/^\S+\s/, "")}`}
        className={`flex h-9 w-9 items-center justify-center rounded-full border-transparent text-lg transition ${actual.color}`}
      >
        {actual.emoji}
      </button>
      {abierto && (
        <>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 top-full z-20 mt-1 flex w-44 flex-col gap-1 rounded-xl border border-navy-100 bg-white p-2 shadow-lg">
            {ESTADOS_INSPECTOR.map((e) => (
              <button
                key={e.valor}
                type="button"
                onClick={() => cambiar(e.valor)}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm font-medium transition ${
                  estado === e.valor ? `${e.color} border-transparent` : "border-transparent text-navy-600 hover:bg-navy-50"
                }`}
              >
                <span className="text-base">{e.emoji}</span>
                {e.etiqueta.replace(/^\S+\s/, "")}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CierreModal({
  inspeccionId,
  nombreSugerido,
  onCerrar,
  onCerrado,
}: {
  inspeccionId: string;
  nombreSugerido: string;
  onCerrar: () => void;
  onCerrado: () => void;
}) {
  const [cerradoPor, setCerradoPor] = useState(nombreSugerido);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/inspecciones/${inspeccionId}/cerrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cerradoPor }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo cerrar la inspección");
      return;
    }
    onCerrado();
  }

  return (
    <form onSubmit={confirmar} className="w-full rounded-xl bg-white p-5 shadow-lg">
        <h2 className="mb-1 font-display text-lg font-bold text-navy-900">Cerrar inspección</h2>
        <p className="mb-4 text-sm text-navy-500">
          Esta acción es definitiva. Ya no se podrán registrar más piezas.
        </p>
        <label className="label">Firma de cierre (nombre de quien cierra)</label>
        <input
          className="input"
          value={cerradoPor}
          onChange={(e) => setCerradoPor(e.target.value)}
          required
          minLength={2}
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button type="submit" className="btn-accent" disabled={enviando}>
            {enviando ? "Cerrando…" : "Confirmar cierre"}
          </button>
          <button type="button" className="btn-secondary" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
    </form>
  );
}

function EditarModal({
  inspeccionId,
  inspeccion,
  onCerrar,
  onGuardado,
}: {
  inspeccionId: string;
  inspeccion: Inspeccion;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(inspeccion.nombre);
  const [numeroParte, setNumeroParte] = useState(inspeccion.numeroParte ?? "");
  const [cliente, setCliente] = useState(inspeccion.cliente ?? "");
  const [planta, setPlanta] = useState(inspeccion.planta ?? "");
  const [puntoLimpio, setPuntoLimpio] = useState(inspeccion.puntoLimpio ?? "");
  const [meta, setMeta] = useState(inspeccion.meta ? String(inspeccion.meta) : "");
  const [precioPorPieza, setPrecioPorPieza] = useState(
    inspeccion.precioPorPieza ? String(inspeccion.precioPorPieza) : ""
  );
  const [modoCobro, setModoCobro] = useState<"pieza" | "hora">(inspeccion.modoCobro === "hora" ? "hora" : "pieza");
  const [precioPorHora, setPrecioPorHora] = useState(inspeccion.precioPorHora ? String(inspeccion.precioPorHora) : "");
  const [fechaEntrega, setFechaEntrega] = useState(
    inspeccion.fechaEntrega ? inspeccion.fechaEntrega.slice(0, 10) : ""
  );
  const [instrucciones, setInstrucciones] = useState(inspeccion.instrucciones ?? "");
  const [instruccionesPdfUrl, setInstruccionesPdfUrl] = useState(
    inspeccion.instruccionesPdfUrl ?? ""
  );
  const [inspectorIds, setInspectorIds] = useState<string[]>(
    inspeccion.inspectores.map((a) => a.usuario.id)
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);



  async function manejarEnvio(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/inspecciones/${inspeccionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        numeroParte: numeroParte || null,
        cliente: cliente || null,
        planta: planta || null,
        puntoLimpio: puntoLimpio || null,
        meta: meta ? Number(meta) : 0,
        precioPorPieza: precioPorPieza ? Number(precioPorPieza) : 0,
        modoCobro,
        precioPorHora: precioPorHora ? Number(precioPorHora) : 0,
        fechaEntrega: fechaEntrega ? new Date(fechaEntrega).toISOString() : null,
        instrucciones: instrucciones || null,
        instruccionesPdfUrl: instruccionesPdfUrl || null,
        inspectorIds,
      }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo guardar la inspección");
      return;
    }
    onGuardado();
  }

  return (
      <form
        onSubmit={manejarEnvio}
        className="w-full space-y-3 rounded-xl bg-white p-5 shadow-lg"
      >
        <h2 className="font-display text-lg font-bold text-navy-900">Editar inspección</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nombre</label>
            <input
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label">Número de parte</label>
            <input className="input" value={numeroParte} onChange={(e) => setNumeroParte(e.target.value)} />
          </div>
          <div>
            <label className="label">Cliente</label>
            <ClienteSelect value={cliente} onChange={setCliente} />
          </div>
          <div>
            <label className="label">Planta</label>
            <select className="input" value={planta} onChange={(e) => setPlanta(e.target.value)}>
              <option value="">Selecciona una planta</option>
              {PLANTAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Punto Limpio (lote de material certificado)</label>
            <input
              className="input"
              placeholder="Ej. Lote 4521"
              value={puntoLimpio}
              onChange={(e) => setPuntoLimpio(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Meta de piezas</label>
            <input
              className="input"
              type="number"
              min={0}
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
            />
          </div>
          <CampoCobro
            modo={modoCobro}
            onModo={setModoCobro}
            precioPieza={precioPorPieza}
            onPrecioPieza={setPrecioPorPieza}
            precioHora={precioPorHora}
            onPrecioHora={setPrecioPorHora}
          />
          <div>
            <label className="label">Fecha de entrega</label>
            <input
              className="input"
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Instrucción de trabajo / criterio de aceptación</label>
            <textarea
              className="input"
              rows={3}
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">PDF de instrucción de trabajo (opcional)</label>
            <SubidaPdf url={instruccionesPdfUrl} onCambiar={setInstruccionesPdfUrl} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Inspectores asignados</label>
            <SelectorInspectores numeroParte={numeroParte} seleccionados={inspectorIds} onCambiar={setInspectorIds} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar cambios"}
          </button>
          <button type="button" className="btn-secondary" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </form>
  );
}
