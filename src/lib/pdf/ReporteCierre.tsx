import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { NOMBRE_EMPRESA, NOMBRE_LEGAL, PIE_PDF, PIE_PDF_EN } from "@/lib/branding";
import { crearT, LOCALES, nombreDefecto, type Idioma } from "@/lib/i18n";
import { ZONA_HORARIA } from "@/lib/turnos";

const NAVY = "#142B6B";
const YELLOW = "#F4D935";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1A1A1A" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: YELLOW,
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: {
    backgroundColor: NAVY,
    color: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    fontSize: 16,
    fontWeight: 700,
  },
  headerTitulo: { fontSize: 14, fontWeight: 700, color: NAVY },
  headerSub: { fontSize: 9, color: "#555" },
  seccion: { marginBottom: 14 },
  seccionTitulo: {
    fontSize: 11,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  fila: { flexDirection: "row", marginBottom: 4 },
  etiqueta: { width: 130, color: "#555" },
  valor: { flex: 1, fontWeight: 700 },
  kpiFila: { flexDirection: "row", gap: 10, marginBottom: 14 },
  kpiCaja: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
  },
  kpiValor: { fontSize: 18, fontWeight: 700, color: NAVY },
  kpiEtiqueta: { fontSize: 8, color: "#555", textTransform: "uppercase", marginTop: 2 },
  tabla: { borderWidth: 1, borderColor: "#DDD", borderRadius: 4 },
  tablaFilaHeader: { flexDirection: "row", backgroundColor: NAVY },
  tablaFila: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#EEE" },
  tablaCeldaHeader: { flex: 1, padding: 6, color: "#FFF", fontWeight: 700, fontSize: 9 },
  tablaCelda: { flex: 1, padding: 6, fontSize: 9 },
  paretoFila: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  paretoEtiqueta: { width: 120, fontSize: 8, color: "#333" },
  paretoBarraFondo: {
    flex: 1,
    height: 13,
    backgroundColor: "#F0F1F6",
    borderRadius: 3,
    flexDirection: "row",
  },
  paretoBarra: { height: 13, backgroundColor: NAVY, borderRadius: 3 },
  paretoValor: { width: 24, fontSize: 8, textAlign: "right", marginLeft: 6, color: "#333" },
  firma: {
    marginTop: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#DDD",
  },
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

export type DatosReporte = {
  nombre: string;
  numeroParte: string | null;
  cliente: string | null;
  planta: string | null;
  meta: number;
  fechaEntrega: string | null;
  instrucciones: string | null;
  piezasBuenas: number;
  piezasMalas: number;
  piezasRetrabajadas: number;
  cerradoPor: string | null;
  cerradoEn: string | null;
  creadoEn: string;
  defectos: { tipo: string; cantidad: number }[];
};

export default function ReporteCierre({ datos, idioma = "es" }: { datos: DatosReporte; idioma?: Idioma }) {
  const t = crearT(idioma);
  const locale = LOCALES[idioma];
  const fechaHora = (iso: string) => new Date(iso).toLocaleString(locale, { timeZone: ZONA_HORARIA });
  const def = (tipo: string) => nombreDefecto(tipo, idioma);
  const total = datos.piezasBuenas + datos.piezasMalas;
  const porcentajeRechazo = total > 0 ? (datos.piezasMalas / total) * 100 : 0;
  const topDefectos = [...datos.defectos].sort((a, b) => b.cantidad - a.cantidad).slice(0, 8);
  const maxCantidad = topDefectos.reduce((max, d) => Math.max(max, d.cantidad), 0);

  return (
    <Document title={`${t("Reporte de cierre", "Closing report")} - ${datos.nombre}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>{NOMBRE_EMPRESA}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.headerTitulo}>{t("Reporte de Cierre de Inspección", "Inspection Closing Report")}</Text>
            <Text style={styles.headerSub}>{NOMBRE_LEGAL}</Text>
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>{t("Datos generales", "General information")}</Text>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>{t("Inspección", "Inspection")}</Text>
            <Text style={styles.valor}>{datos.nombre}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>{t("Número de parte", "Part number")}</Text>
            <Text style={styles.valor}>{datos.numeroParte ?? "—"}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>{t("Cliente", "Customer")}</Text>
            <Text style={styles.valor}>{datos.cliente ?? "—"}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>{t("Planta", "Plant")}</Text>
            <Text style={styles.valor}>{datos.planta ?? "—"}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>{t("Fecha de entrega", "Due date")}</Text>
            <Text style={styles.valor}>
              {datos.fechaEntrega ? new Date(datos.fechaEntrega).toLocaleDateString(locale, { timeZone: "UTC" }) : "—"}
            </Text>
          </View>
          {datos.instrucciones && (
            <View style={styles.fila}>
              <Text style={styles.etiqueta}>{t("Instrucción de trabajo", "Work instruction")}</Text>
              <Text style={styles.valor}>{datos.instrucciones}</Text>
            </View>
          )}
        </View>

        <View style={styles.kpiFila}>
          <View style={styles.kpiCaja}>
            <Text style={styles.kpiValor}>{total}</Text>
            <Text style={styles.kpiEtiqueta}>{t("Piezas inspeccionadas", "Parts inspected")}</Text>
          </View>
          <View style={styles.kpiCaja}>
            <Text style={styles.kpiValor}>{datos.piezasBuenas}</Text>
            <Text style={styles.kpiEtiqueta}>{t("Piezas buenas", "Good parts")}</Text>
          </View>
          <View style={styles.kpiCaja}>
            <Text style={styles.kpiValor}>{datos.piezasMalas}</Text>
            <Text style={styles.kpiEtiqueta}>{t("Piezas malas", "Rejected parts")}</Text>
          </View>
          <View style={styles.kpiCaja}>
            <Text style={styles.kpiValor}>{porcentajeRechazo.toFixed(1)}%</Text>
            <Text style={styles.kpiEtiqueta}>{t("% Rechazo", "% Reject")}</Text>
          </View>
        </View>
        {datos.piezasRetrabajadas > 0 && (
          <View style={styles.kpiFila}>
            <View style={styles.kpiCaja}>
              <Text style={styles.kpiValor}>{datos.piezasRetrabajadas}</Text>
              <Text style={styles.kpiEtiqueta}>{t("Recuperadas con retrabajo", "Recovered by rework")}</Text>
            </View>
            <View style={styles.kpiCaja}>
              <Text style={styles.kpiValor}>{datos.piezasMalas - datos.piezasRetrabajadas}</Text>
              <Text style={styles.kpiEtiqueta}>{t("NG final (scrap)", "Final NG (scrap)")}</Text>
            </View>
          </View>
        )}

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>{t("Pareto de defectos", "Defect Pareto")}</Text>
          {topDefectos.length === 0 ? (
            <Text>{t("No se registraron defectos.", "No defects were recorded.")}</Text>
          ) : (
            <View>
              {topDefectos.map((d) => (
                <View style={styles.paretoFila} key={d.tipo}>
                  <Text style={styles.paretoEtiqueta}>{def(d.tipo)}</Text>
                  <View style={styles.paretoBarraFondo}>
                    <View
                      style={[
                        styles.paretoBarra,
                        { width: `${maxCantidad > 0 ? (d.cantidad / maxCantidad) * 100 : 0}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.paretoValor}>{d.cantidad}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>{t("Detalle de defectos", "Defect detail")}</Text>
          {topDefectos.length === 0 ? (
            <Text>{t("No se registraron defectos.", "No defects were recorded.")}</Text>
          ) : (
            <View style={styles.tabla}>
              <View style={styles.tablaFilaHeader}>
                <Text style={[styles.tablaCeldaHeader, { flex: 2 }]}>{t("Tipo de defecto", "Defect type")}</Text>
                <Text style={styles.tablaCeldaHeader}>{t("Cantidad", "Quantity")}</Text>
                <Text style={styles.tablaCeldaHeader}>{t("% del total malas", "% of rejects")}</Text>
              </View>
              {topDefectos.map((d) => (
                <View style={styles.tablaFila} key={d.tipo}>
                  <Text style={[styles.tablaCelda, { flex: 2 }]}>{def(d.tipo)}</Text>
                  <Text style={styles.tablaCelda}>{d.cantidad}</Text>
                  <Text style={styles.tablaCelda}>
                    {datos.piezasMalas > 0 ? ((d.cantidad / datos.piezasMalas) * 100).toFixed(1) : "0"}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.firma}>
          <Text style={styles.seccionTitulo}>{t("Cierre", "Closure")}</Text>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>{t("Cerrado por", "Closed by")}</Text>
            <Text style={styles.valor}>{datos.cerradoPor ?? "—"}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>{t("Fecha y hora de cierre", "Closed on")}</Text>
            <Text style={styles.valor}>
              {datos.cerradoEn ? fechaHora(datos.cerradoEn) : "—"}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          {t(PIE_PDF, PIE_PDF_EN)} · {fechaHora(new Date().toISOString())}
        </Text>
      </Page>
    </Document>
  );
}
