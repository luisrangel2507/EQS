import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { NOMBRE_EMPRESA, NOMBRE_LEGAL, PIE_PDF } from "@/lib/branding";
import { DISCIPLINAS, type ClaveDisciplina } from "@/lib/ochoD";

const NAVY = "#142B6B";
const YELLOW = "#F4D935";

const s = StyleSheet.create({
  page: { padding: 32, paddingBottom: 56, fontSize: 10, fontFamily: "Helvetica", color: "#1A1A1A" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: YELLOW,
    paddingBottom: 12,
    marginBottom: 14,
  },
  logo: { backgroundColor: NAVY, color: "#FFF", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4, fontSize: 16, fontWeight: 700 },
  titulo: { fontSize: 14, fontWeight: 700, color: NAVY },
  sub: { fontSize: 9, color: "#555" },
  datos: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: "#DDD", borderRadius: 4, marginBottom: 14 },
  dato: { width: "33.33%", padding: 6 },
  etiqueta: { fontSize: 7, color: "#777", textTransform: "uppercase" },
  valor: { fontSize: 10, fontWeight: 700, color: NAVY, marginTop: 1 },
  disciplina: { marginBottom: 10, borderLeftWidth: 3, borderLeftColor: NAVY, paddingLeft: 8 },
  dTitulo: { fontSize: 10, fontWeight: 700, color: NAVY, marginBottom: 3 },
  dTexto: { fontSize: 9.5, lineHeight: 1.4 },
  vacio: { fontSize: 9, color: "#AAA" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 6,
  },
});

export type Datos8D = Record<ClaveDisciplina, string | null> & {
  folio: number;
  defecto: string | null;
  estado: string;
  creadoEn: string;
  cerradoEn: string | null;
  creadoPor: string;
  inspeccion: { nombre: string; numeroParte: string | null; cliente: string | null; planta: string | null };
};

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-MX") : "—");

export default function Reporte8DPdf({ r }: { r: Datos8D }) {
  const datos: [string, string][] = [
    ["Folio", `8D-${String(r.folio).padStart(4, "0")}`],
    ["Número de parte", r.inspeccion.numeroParte ?? "—"],
    ["Cliente", r.inspeccion.cliente ?? "—"],
    ["Defecto", r.defecto ?? "General"],
    ["Planta", r.inspeccion.planta ?? "—"],
    ["Estado", r.estado === "cerrado" ? `Cerrado ${fecha(r.cerradoEn)}` : "Abierto"],
    ["Abierto", fecha(r.creadoEn)],
    ["Responsable", r.creadoPor],
    ["Inspección", r.inspeccion.nombre],
  ];

  return (
    <Document title={`8D-${r.folio}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.logo}>{NOMBRE_EMPRESA}</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.titulo}>Reporte 8D · Acción correctiva</Text>
            <Text style={s.sub}>{NOMBRE_LEGAL}</Text>
          </View>
        </View>

        <View style={s.datos}>
          {datos.map(([e, v]) => (
            <View key={e} style={s.dato}>
              <Text style={s.etiqueta}>{e}</Text>
              <Text style={s.valor}>{v}</Text>
            </View>
          ))}
        </View>

        {DISCIPLINAS.map((d) => (
          <View key={d.clave} style={s.disciplina} wrap={false}>
            <Text style={s.dTitulo}>
              {d.codigo} · {d.titulo}
            </Text>
            {r[d.clave]?.trim() ? <Text style={s.dTexto}>{r[d.clave]}</Text> : <Text style={s.vacio}>Pendiente</Text>}
          </View>
        ))}

        <Text style={s.footer} fixed>
          {PIE_PDF} · {new Date().toLocaleString("es-MX")}
        </Text>
      </Page>
    </Document>
  );
}
