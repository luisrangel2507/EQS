import { ESTADOS_INSPECTOR } from "@/lib/constants";

export type Inspeccion = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  planta: string | null;
  piezasBuenas: number;
  piezasMalas: number;
  porcentajeRechazo: number;
};

export type SorteoAbierto = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  cliente: string | null;
  planta: string | null;
  piezasBuenas: number;
  piezasMalas: number;
  inspectoresRevisando: number;
  topDefecto: string | null;
};

export type DashboardData = {
  kpis: {
    inspeccionesActivas: number;
    piezasInspeccionadasMes: number;
    facturadoMes: number | null;
    porcentajeRechazoGlobal: number;
    inspeccionesEnCritico: number;
  };
  alertasRechazo: Inspeccion[];
  inspectoresEnPausa: { usuarioId: string; nombre: string; estado: string; minutos: number }[];
  estadoInspectores: { usuarioId: string; nombre: string; estado: string; desde: string }[];
  sorteosAbiertos: SorteoAbierto[];
};

export type SolicitudApoyo = {
  id: string;
  estacion: string | null;
  creadoEn: string;
  usuario: { id: string; nombre: string };
  inspeccion: { id: string; nombre: string; numeroParte: string | null } | null;
};

export type Residente = {
  id: string;
  nombre: string;
  rol: string;
  plantaResidente: string | null;
};

export function estadoInfo(valor: string) {
  return ESTADOS_INSPECTOR.find((e) => e.valor === valor) ?? ESTADOS_INSPECTOR[0];
}

export function formatoMoneda(valor: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(valor);
}

const TONOS_PILL: Record<string, string> = {
  navy: "from-navy-700 to-navy-900 text-white",
  azul: "from-blue-500 to-indigo-600 text-white",
  verde: "from-emerald-500 to-teal-600 text-white",
  rojo: "from-red-500 to-orange-500 text-white",
};

export function Pill({ tono, children }: { tono: keyof typeof TONOS_PILL; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-black/5 ${TONOS_PILL[tono]}`}
    >
      {children}
    </span>
  );
}

export function Kpi({
  etiqueta,
  valor,
  alerta,
}: {
  etiqueta: string;
  valor: string | number;
  alerta?: boolean;
}) {
  return (
    <div className={`card ${alerta ? "border-red-300 bg-red-50" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">{etiqueta}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${alerta ? "text-red-700" : "text-navy-900"}`}>
        {valor}
      </p>
    </div>
  );
}
