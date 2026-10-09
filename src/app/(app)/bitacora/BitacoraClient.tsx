"use client";

import { useState } from "react";
import { usePolling } from "@/lib/usePolling";
import { useIdioma } from "@/components/ui/Idioma";
import { SkeletonPagina } from "@/components/ui/Skeleton";

type Fila = {
  id: string;
  usuarioNombre: string;
  usuarioRol: string | null;
  accion: string;
  entidad: string;
  entidadId: string;
  resumen: string;
  antes: unknown;
  despues: unknown;
  motivo: string | null;
  ip: string | null;
  creadoEn: string;
};

type Datos = { total: number; pagina: number; porPagina: number; filas: Fila[] };

const ENTIDADES: [string, string, string][] = [
  ["Inspeccion", "Inspecciones", "Inspections"],
  ["Captura", "Capturas", "Captures"],
  ["Auditoria", "Auditorías", "Audits"],
  ["Reporte8D", "Reportes 8D", "8D reports"],
  ["Asistencia", "Asistencia", "Attendance"],
  ["Usuario", "Usuarios", "Users"],
  ["Criterio", "Criterios de certificación", "Certification criteria"],
  ["Enlace", "Enlaces compartidos", "Shared links"],
  ["Documento", "Documentos", "Documents"],
];

const ACCIONES: [string, string, string][] = [
  ["CREAR", "Alta", "Created"],
  ["EDITAR", "Edición", "Edited"],
  ["ANULAR", "Anulación", "Voided"],
  ["ELIMINAR", "Eliminación", "Deleted"],
  ["CERRAR", "Cierre", "Closed"],
  ["REABRIR", "Reapertura", "Reopened"],
  ["COMPLETAR", "Completado", "Completed"],
  ["DESACTIVAR", "Desactivación", "Deactivated"],
  ["ACTIVAR", "Activación", "Activated"],
  ["APROBAR", "Aprobación", "Approved"],
  ["RECHAZAR", "Rechazo", "Rejected"],
  ["RETIRAR", "Retiro", "Withdrawn"],
  ["BLOQUEAR", "Bloqueo de acceso", "Access lockout"],
];

const COLOR: Record<string, string> = {
  ANULAR: "bg-red-50 text-red-700",
  ELIMINAR: "bg-red-50 text-red-700",
  DESACTIVAR: "bg-amber-50 text-amber-700",
  BLOQUEAR: "bg-amber-50 text-amber-700",
  CREAR: "bg-emerald-50 text-emerald-700",
};

function Detalle({ valor }: { valor: unknown }) {
  if (valor === null || valor === undefined || typeof valor !== "object") return <span className="text-navy-400">—</span>;
  return (
    <dl className="space-y-0.5 text-xs">
      {Object.entries(valor as Record<string, unknown>).map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="shrink-0 font-semibold text-navy-500">{k}:</dt>
          <dd className="min-w-0 break-words text-navy-800">{v === null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function BitacoraClient() {
  const { t } = useIdioma();
  const [entidad, setEntidad] = useState("");
  const [accion, setAccion] = useState("");
  const [q, setQ] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (entidad) params.set("entidad", entidad);
  if (accion) params.set("accion", accion);
  if (q.trim()) params.set("q", q.trim());
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  const base = params.toString();
  params.set("pagina", String(pagina));

  const { datos, cargando, actualizando } = usePolling<Datos>(`/api/bitacora?${params}`, 30000);

  const cambiar = (fn: () => void) => {
    fn();
    setPagina(1);
  };
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (cargando && !datos) return <SkeletonPagina />;
  const paginas = datos ? Math.max(1, Math.ceil(datos.total / datos.porPagina)) : 1;

  return (
    <div className="carga-suave space-y-5" aria-busy={actualizando}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">{t("Bitácora de cambios", "Change log")}</h1>
          <p className="text-sm text-navy-500">
            {t(
              "Quién hizo qué y cuándo. Los registros no se pueden editar ni borrar.",
              "Who did what and when. Entries cannot be edited or deleted."
            )}
          </p>
        </div>
        <a className="btn-secondary" href={`/api/bitacora?${base}${base ? "&" : ""}formato=csv`}>
          {t("Exportar CSV", "Export CSV")}
        </a>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="label">{t("Buscar", "Search")}</label>
          <input
            className="input"
            value={q}
            onChange={(e) => cambiar(() => setQ(e.target.value))}
            placeholder={t("Usuario, motivo, texto…", "User, reason, text…")}
          />
        </div>
        <div>
          <label className="label">{t("Registro", "Record")}</label>
          <select className="input" value={entidad} onChange={(e) => cambiar(() => setEntidad(e.target.value))}>
            <option value="">{t("Todos", "All")}</option>
            {ENTIDADES.map(([v, es, en]) => (
              <option key={v} value={v}>
                {t(es, en)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("Acción", "Action")}</label>
          <select className="input" value={accion} onChange={(e) => cambiar(() => setAccion(e.target.value))}>
            <option value="">{t("Todas", "All")}</option>
            {ACCIONES.map(([v, es, en]) => (
              <option key={v} value={v}>
                {t(es, en)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("Desde", "From")}</label>
          <input type="date" className="input" value={desde} onChange={(e) => cambiar(() => setDesde(e.target.value))} />
        </div>
        <div>
          <label className="label">{t("Hasta", "To")}</label>
          <input type="date" className="input" value={hasta} onChange={(e) => cambiar(() => setHasta(e.target.value))} />
        </div>
      </div>

      {!datos?.filas.length ? (
        <div className="card p-10 text-center text-sm text-navy-500">
          {t("No hay movimientos con esos filtros.", "No entries match these filters.")}
        </div>
      ) : (
        <div className="card divide-y divide-navy-100 overflow-hidden">
          {datos.filas.map((f) => {
            const accionTxt = ACCIONES.find(([v]) => v === f.accion);
            const entidadTxt = ENTIDADES.find(([v]) => v === f.entidad);
            const expandida = abierta === f.id;
            const hayDetalle = Boolean(f.antes || f.despues);
            return (
              <div key={f.id} className="p-4">
                <button
                  type="button"
                  className="flex w-full flex-wrap items-start gap-x-3 gap-y-1 text-left"
                  onClick={() => setAbierta(expandida ? null : f.id)}
                  aria-expanded={expandida}
                >
                  <span className={`badge order-1 ${COLOR[f.accion] ?? "bg-navy-50 text-navy-700"}`}>
                    {accionTxt ? t(accionTxt[1], accionTxt[2]) : f.accion}
                  </span>
                  <span className="order-3 w-full min-w-0 text-sm font-semibold text-navy-900 sm:order-2 sm:w-auto sm:flex-1">{f.resumen}</span>
                  <span className="order-2 ml-auto text-xs text-navy-500 sm:order-3 sm:ml-0">{fmt(f.creadoEn)}</span>
                </button>
                <p className="mt-1 text-xs text-navy-500">
                  {f.usuarioNombre}
                  {f.usuarioRol ? ` · ${f.usuarioRol}` : ""} · {entidadTxt ? t(entidadTxt[1], entidadTxt[2]) : f.entidad}
                </p>
                {f.motivo && (
                  <p className="mt-2 rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-800">
                    <span className="font-semibold">{t("Motivo", "Reason")}:</span> {f.motivo}
                  </p>
                )}
                {expandida && (
                  <div className="mt-3 grid gap-3 rounded-lg border border-navy-100 p-3 sm:grid-cols-2">
                    <div>
                      <p className="label">{t("Antes", "Before")}</p>
                      <Detalle valor={f.antes} />
                    </div>
                    <div>
                      <p className="label">{t("Después", "After")}</p>
                      <Detalle valor={f.despues} />
                    </div>
                    <p className="text-[11px] text-navy-400 sm:col-span-2">
                      ID: {f.entidadId}
                      {f.ip ? ` · IP ${f.ip}` : ""}
                      {!hayDetalle ? ` · ${t("sin detalle de campos", "no field detail")}` : ""}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {datos && datos.total > datos.porPagina && (
        <div className="flex items-center justify-between">
          <button className="btn-secondary" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            ← {t("Anterior", "Previous")}
          </button>
          <span className="text-sm text-navy-500">
            {pagina} / {paginas} · {datos.total}
          </span>
          <button className="btn-secondary" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>
            {t("Siguiente", "Next")} →
          </button>
        </div>
      )}
    </div>
  );
}
