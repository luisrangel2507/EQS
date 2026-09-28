import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { NOMBRE_EMPRESA, NOMBRE_LEGAL, PIE_PDF, PIE_PDF_EN } from "@/lib/branding";
import { crearT, LOCALES, nombreDefecto, type Idioma } from "@/lib/i18n";
import { ZONA_HORARIA } from "@/lib/turnos";
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


export default function Reporte8DPdf({ r, idioma = "es" }: { r: Datos8D; idioma?: Idioma }) {
  const t = crearT(idioma);
  const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(LOCALES[idioma], { timeZone: ZONA_HORARIA }) : "—");
  const datos: [string, string][] = [
    [t("Folio", "No."), `8D-${String(r.folio).padStart(4, "0")}`],
    [t("Número de parte", "Part number"), r.inspeccion.numeroParte ?? "—"],
    [t("Cliente", "Customer"), r.inspeccion.cliente ?? "—"],
    [t("Defecto", "Defect"), r.defecto ? nombreDefecto(r.defecto, idioma) : "General"],
    [t("Planta", "Plant"), r.inspeccion.planta ?? "—"],
    [t("Estado", "Status"), r.estado === "cerrado" ? `${t("Cerrado", "Closed")} ${fecha(r.cerradoEn)}` : t("Abierto", "Open")],
    [t("Abierto", "Opened"), fecha(r.creadoEn)],
    [t("Responsable", "Owner"), r.creadoPor],
    [t("Inspección", "Inspection"), r.inspeccion.nombre],
  ];

  return (
    <Document title={`8D-${r.folio}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.logo}>{NOMBRE_EMPRESA}</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.titulo}>{t("Reporte 8D · Acción correctiva", "8D Report · Corrective action")}</Text>
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
              {d.codigo} · {t(d.titulo, d.en)}
            </Text>
            {r[d.clave]?.trim() ? <Text style={s.dTexto}>{r[d.clave]}</Text> : <Text style={s.vacio}>{t("Pendiente", "Pending")}</Text>}
          </View>
        ))}

        <Text style={s.footer} fixed>
          {t(PIE_PDF, PIE_PDF_EN)} · {new Date().toLocaleString(LOCALES[idioma], { timeZone: ZONA_HORARIA })}
        </Text>
      </Page>
    </Document>
  );
}
