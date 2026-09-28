"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { AnimatePresence, motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import { Kpi } from "@/app/(app)/dashboard/shared";
import { SkeletonPagina } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import { vibrar } from "@/lib/feedback";
import { NOMBRE_EMPRESA, NOMBRE_LEGAL } from "@/lib/branding";

type Etiqueta = {
  id: string;
  folio: number;
  codigo: string;
  tanda: string;
  contenedor: number;
  totalContenedores: number;
  cantidad: number;
  lote: string | null;
  creadoEn: string;
  anulada: boolean;
  motivoAnulacion: string | null;
  escaneos: number;
  ultimoEscaneo: string | null;
  creadaPor: { nombre: string };
};

type Datos = {
  inspeccion: {
    id: string;
    nombre: string;
    numeroParte: string | null;
    cliente: string | null;
    planta: string | null;
    puntoLimpio: string | null;
    cerrado: boolean;
  };
  etiquetas: Etiqueta[];
  liberables: number;
  etiquetadas: number;
  disponibles: number;
  puedeImprimir: boolean;
};

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const miles = (n: number) => n.toLocaleString("es-MX");

export default function LiberacionClient({ id, puedeAnular }: { id: string; puedeAnular: boolean }) {
  const { datos, cargando, recargar } = usePolling<Datos>(`/api/inspecciones/${id}/etiquetas`, 20000);
  const [aImprimir, setAImprimir] = useState<Etiqueta[] | null>(null);
  // cambia en cada impresión para remontar la hoja y volver a lanzar el diálogo de impresión
  const [hoja, setHoja] = useState(0);
  const imprimir = (ets: Etiqueta[]) => {
    setHoja((h) => h + 1);
    setAImprimir(ets);
  };
  const [anulando, setAnulando] = useState<Etiqueta | null>(null);

  const tandas = useMemo(() => {
    const grupos = new Map<string, Etiqueta[]>();
    for (const e of datos?.etiquetas ?? []) grupos.set(e.tanda, [...(grupos.get(e.tanda) ?? []), e]);
    return Array.from(grupos.values()).map((ets) => ets.sort((a, b) => a.contenedor - b.contenedor));
  }, [datos?.etiquetas]);

  if (cargando && !datos) return <SkeletonPagina />;
  if (!datos) return null;
  const { inspeccion } = datos;

  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
        <div>
          <Link href={`/inspecciones/${id}`} className="text-xs font-semibold text-navy-400 hover:text-navy-700">
            ← {inspeccion.numeroParte ?? inspeccion.nombre}
          </Link>
          <h1 className="font-display text-2xl font-bold text-navy-900">✅ Liberar material</h1>
          <p className="text-sm text-navy-500">
            Imprime una etiqueta por contenedor. Su QR abre una página pública donde tu cliente (o su cliente) verifica qué se
            inspeccionó, cuándo y por quién.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Kpi etiqueta="Buenas + recuperadas" valor={datos.liberables} />
          <Kpi etiqueta="Ya etiquetadas" valor={datos.etiquetadas} indice={1} />
          <Kpi etiqueta="Por liberar" valor={datos.disponibles} indice={2} />
        </div>

        {datos.puedeImprimir && (
          <FormularioLiberacion
            id={id}
            disponibles={datos.disponibles}
            loteSugerido={inspeccion.puntoLimpio}
            onGenerado={(ets) => {
              recargar();
              imprimir(ets);
            }}
          />
        )}

        <div className="card p-0">
          <h2 className="border-b border-navy-100 px-5 py-3 font-display font-semibold text-navy-900">Historial de liberaciones</h2>
          {tandas.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-navy-400">Aún no se ha liberado material de esta inspección.</p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {tandas.map((ets) => (
                <Tanda
                  key={ets[0].tanda}
                  etiquetas={ets}
                  puedeAnular={puedeAnular}
                  onImprimir={() => imprimir(ets.filter((e) => !e.anulada))}
                  onAnular={setAnulando}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal abierto={Boolean(anulando)} onCerrar={() => setAnulando(null)} ancho="max-w-md">
        {anulando && (
          <Anulacion
            etiqueta={anulando}
            onCerrar={() => setAnulando(null)}
            onHecho={() => {
              setAnulando(null);
              recargar();
            }}
          />
        )}
      </Modal>

      {aImprimir && aImprimir.length > 0 && (
        <HojaEtiquetas key={hoja} etiquetas={aImprimir} inspeccion={inspeccion} onCerrar={() => setAImprimir(null)} />
      )}
    </div>
  );
}

function FormularioLiberacion({
  id,
  disponibles,
  loteSugerido,
  onGenerado,
}: {
  id: string;
  disponibles: number;
  loteSugerido: string | null;
  onGenerado: (e: Etiqueta[]) => void;
}) {
  const toast = useToast();
  const [piezas, setPiezas] = useState(String(disponibles || ""));
  const [porContenedor, setPorContenedor] = useState("");
  const [lote, setLote] = useState(loteSugerido ?? "");
  const [enviando, setEnviando] = useState(false);

  // cuando llegan nuevas capturas y el campo sigue con el total anterior, lo mantenemos al día
  const [ultimoDisponible, setUltimoDisponible] = useState(disponibles);
  useEffect(() => {
    if (disponibles !== ultimoDisponible) {
      if (Number(piezas) === ultimoDisponible || !piezas) setPiezas(disponibles ? String(disponibles) : "");
      setUltimoDisponible(disponibles);
    }
  }, [disponibles, ultimoDisponible, piezas]);

  const p = Number(piezas) || 0;
  const c = Number(porContenedor) || 0;
  const total = p && c ? Math.ceil(p / c) : 0;
  const ultimo = total ? p - c * (total - 1) : 0;

  if (disponibles === 0) {
    return (
      <div className="card flex items-center gap-3 text-sm text-navy-500">
        <span className="text-2xl">📦</span>
        Todas las piezas buenas ya tienen etiqueta. Cuando se capturen más, podrás liberarlas aquí.
      </div>
    );
  }

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const res = await fetch(`/api/inspecciones/${id}/etiquetas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ piezas: p, porContenedor: c, lote: lote || null }),
    }).catch(() => null);
    setEnviando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      vibrar("error");
      toast.error(d?.error ?? "Sin conexión; intenta de nuevo");
      return;
    }
    vibrar("exito");
    toast.exito(`${d.etiquetas.length} etiqueta(s) listas para imprimir`);
    setPorContenedor("");
    onGenerado(d.etiquetas);
  }

  return (
    <form onSubmit={generar} className="card space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Piezas a liberar</label>
          <input
            className="input"
            type="number"
            min={1}
            max={disponibles}
            required
            value={piezas}
            onChange={(e) => setPiezas(e.target.value)}
          />
          <p className="mt-1 text-xs text-navy-400">Máximo {miles(disponibles)}</p>
        </div>
        <div>
          <label className="label">Piezas por contenedor</label>
          <input
            className="input"
            type="number"
            min={1}
            required
            value={porContenedor}
            onChange={(e) => setPorContenedor(e.target.value)}
            placeholder="Ej. 250"
          />
        </div>
        <div>
          <label className="label">Lote (opcional)</label>
          <input className="input" value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Ej. L-2409-A" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-navy-600">
          {total > 0 ? (
            <>
              Se imprimirán <b>{total}</b> etiqueta{total === 1 ? "" : "s"}
              {total > 1 && ultimo !== c ? (
                <>
                  : {total - 1} × {miles(c)} pzs + 1 × {miles(ultimo)} pzs
                </>
              ) : (
                <> de {miles(c)} pzs</>
              )}
            </>
          ) : (
            "Indica cuántas piezas lleva cada contenedor."
          )}
        </p>
        <button className="btn-primary" disabled={enviando || !total || p > disponibles}>
          {enviando ? "Generando…" : "🏷️ Generar e imprimir"}
        </button>
      </div>
    </form>
  );
}

function Tanda({
  etiquetas,
  puedeAnular,
  onImprimir,
  onAnular,
}: {
  etiquetas: Etiqueta[];
  puedeAnular: boolean;
  onImprimir: () => void;
  onAnular: (e: Etiqueta) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const primera = etiquetas[0];
  const vigentes = etiquetas.filter((e) => !e.anulada);
  const piezas = vigentes.reduce((s, e) => s + e.cantidad, 0);
  const escaneos = etiquetas.reduce((s, e) => s + e.escaneos, 0);

  return (
    <li>
      <div className="flex flex-wrap items-center gap-3 px-5 py-3">
        <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setAbierta((a) => !a)}>
          <motion.span animate={{ rotate: abierta ? 90 : 0 }} className="text-navy-400">
            ▸
          </motion.span>
          <span className="min-w-0">
            <span className="block font-semibold text-navy-900">
              {etiquetas.length} contenedor{etiquetas.length === 1 ? "" : "es"} · {miles(piezas)} pzs
              {primera.lote && <span className="font-normal text-navy-500"> · Lote {primera.lote}</span>}
            </span>
            <span className="text-xs text-navy-400">
              {fechaCorta(primera.creadoEn)} · {primera.creadaPor.nombre} · 👁 {escaneos} escaneo{escaneos === 1 ? "" : "s"}
              {vigentes.length < etiquetas.length && (
                <span className="ml-1 font-semibold text-red-600">· {etiquetas.length - vigentes.length} anulada(s)</span>
              )}
            </span>
          </span>
        </button>
        {vigentes.length > 0 && (
          <button className="btn-secondary text-sm" onClick={onImprimir}>
            🖨️ Reimprimir
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-navy-50">
                {etiquetas.map((e) => (
                  <tr key={e.id} className={e.anulada ? "bg-red-50/60" : ""}>
                    <td className="py-2 pl-12 pr-3 tabular-nums text-navy-500">
                      {e.contenedor}/{e.totalContenedores}
                    </td>
                    <td className="px-3 py-2">
                      <a href={`/t/${e.codigo}`} target="_blank" rel="noreferrer" className="font-mono font-semibold text-navy-800 hover:underline">
                        {e.codigo}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{miles(e.cantidad)} pzs</td>
                    <td className="px-3 py-2 text-xs text-navy-400">
                      {e.escaneos ? `👁 ${e.escaneos} · ${fechaCorta(e.ultimoEscaneo!)}` : "Sin escanear"}
                    </td>
                    <td className="px-5 py-2 text-right">
                      {e.anulada ? (
                        <span className="badge bg-red-100 text-red-700" title={e.motivoAnulacion ?? ""}>
                          Anulada
                        </span>
                      ) : (
                        puedeAnular && (
                          <button className="text-xs font-semibold text-navy-400 hover:text-red-600" onClick={() => onAnular(e)}>
                            Anular
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Anulacion({ etiqueta, onCerrar, onHecho }: { etiqueta: Etiqueta; onCerrar: () => void; onHecho: () => void }) {
  const toast = useToast();
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function anular(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const res = await fetch(`/api/etiquetas/${etiqueta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });
    setEnviando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? "No se pudo anular");
      return;
    }
    toast.exito(`Etiqueta ${etiqueta.codigo} anulada; su QR ahora avisa que no se use`);
    onHecho();
  }

  return (
    <form onSubmit={anular} className="space-y-3 rounded-2xl bg-white p-5 shadow-2xl">
      <h2 className="font-display text-lg font-bold text-navy-900">
        Anular contenedor {etiqueta.contenedor}/{etiqueta.totalContenedores}
      </h2>
      <p className="text-sm text-navy-500">
        Las {miles(etiqueta.cantidad)} piezas vuelven a quedar disponibles para liberar. Quien escanee el QR{" "}
        <span className="font-mono">{etiqueta.codigo}</span> verá en rojo que no debe usar el material.
      </p>
      <div>
        <label className="label">Motivo</label>
        <input
          className="input"
          required
          minLength={3}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Contenedor se mezcló con material sin inspeccionar"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar}>
          Cancelar
        </button>
        <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={enviando}>
          {enviando ? "Anulando…" : "Anular etiqueta"}
        </button>
      </div>
    </form>
  );
}

function HojaEtiquetas({
  etiquetas,
  inspeccion,
  onCerrar,
}: {
  etiquetas: Etiqueta[];
  inspeccion: Datos["inspeccion"];
  onCerrar: () => void;
}) {
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const listos = etiquetas.every((e) => qrs[e.codigo]);

  useEffect(() => {
    let vivo = true;
    Promise.all(
      etiquetas.map(async (e) => [
        e.codigo,
        await QRCode.toDataURL(`${window.location.origin}/t/${e.codigo}`, {
          width: 360,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#0A163C", light: "#FFFFFF" },
        }),
      ])
    ).then((pares) => vivo && setQrs(Object.fromEntries(pares)));
    return () => {
      vivo = false;
    };
  }, [etiquetas]);

  // imprime solo en cuanto están todos los QR, y una sola vez por hoja
  useEffect(() => {
    if (!listos) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [listos]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="font-display font-semibold text-navy-900">Vista previa ({etiquetas.length})</h2>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={onCerrar}>
            Cerrar
          </button>
          <button className="btn-accent" onClick={() => window.print()} disabled={!listos}>
            🖨️ Imprimir
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-3">
        {etiquetas.map((e) => (
          <div
            key={e.id}
            className="break-inside-avoid overflow-hidden rounded-xl border-2 border-navy-900 bg-white text-navy-900 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]"
          >
            <div className="flex items-center justify-between bg-emerald-600 px-3 py-1.5 text-white">
              <span className="font-display text-lg font-extrabold tracking-wide">✓ MATERIAL LIBERADO</span>
              <span className="text-xs font-bold">{NOMBRE_EMPRESA}</span>
            </div>
            <div className="flex gap-3 p-3">
              <div className="shrink-0 text-center">
                {qrs[e.codigo] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrs[e.codigo]} alt={`QR ${e.codigo}`} className="h-32 w-32" />
                ) : (
                  <div className="skeleton h-32 w-32 rounded" />
                )}
                <p className="font-mono text-sm font-bold tracking-widest">{e.codigo}</p>
              </div>
              <div className="min-w-0 flex-1 space-y-0.5 text-xs">
                <p className="text-[10px] font-semibold uppercase text-navy-500">No. de parte</p>
                <p className="font-display text-xl font-extrabold leading-tight">{inspeccion.numeroParte ?? inspeccion.nombre}</p>
                {inspeccion.numeroParte && <p className="truncate">{inspeccion.nombre}</p>}
                {inspeccion.cliente && <p>Cliente: {inspeccion.cliente}</p>}
                {e.lote && <p>Lote: {e.lote}</p>}
                <div className="flex items-end justify-between pt-1">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-navy-500">Cantidad</p>
                    <p className="font-display text-2xl font-extrabold leading-none">{miles(e.cantidad)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase text-navy-500">Contenedor</p>
                    <p className="font-display text-lg font-bold leading-none">
                      {e.contenedor} / {e.totalContenedores}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between border-t border-navy-200 px-3 py-1 text-[10px] text-navy-500">
              <span>
                {new Date(e.creadoEn).toLocaleDateString("es-MX")} · {e.creadaPor.nombre}
              </span>
              <span>
                L-{String(e.folio).padStart(6, "0")} · {NOMBRE_LEGAL}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
