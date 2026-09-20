import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

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
  cerradoPor: string | null;
  cerradoEn: string | null;
  creadoEn: string;
  defectos: { tipo: string; cantidad: number }[];
};

export default function ReporteCierre({ datos }: { datos: DatosReporte }) {
  const total = datos.piezasBuenas + datos.piezasMalas;
  const porcentajeRechazo = total > 0 ? (datos.piezasMalas / total) * 100 : 0;
  const topDefectos = [...datos.defectos].sort((a, b) => b.cantidad - a.cantidad).slice(0, 8);
  const maxCantidad = topDefectos.reduce((max, d) => Math.max(max, d.cantidad), 0);

  return (
    <Document title={`Reporte de cierre - ${datos.nombre}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>EQS</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.headerTitulo}>Reporte de Cierre de Inspección</Text>
            <Text style={styles.headerSub}>Ethical Quality Services</Text>
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Datos generales</Text>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Inspección</Text>
            <Text style={styles.valor}>{datos.nombre}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Número de parte</Text>
            <Text style={styles.valor}>{datos.numeroParte ?? "—"}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Cliente</Text>
            <Text style={styles.valor}>{datos.cliente ?? "—"}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Planta</Text>
            <Text style={styles.valor}>{datos.planta ?? "—"}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Fecha de entrega</Text>
            <Text style={styles.valor}>
              {datos.fechaEntrega ? new Date(datos.fechaEntrega).toLocaleDateString("es-MX") : "—"}
            </Text>
          </View>
          {datos.instrucciones && (
            <View style={styles.fila}>
              <Text style={styles.etiqueta}>Instrucción de trabajo</Text>
              <Text style={styles.valor}>{datos.instrucciones}</Text>
            </View>
          )}
        </View>

        <View style={styles.kpiFila}>
          <View style={styles.kpiCaja}>
            <Text style={styles.kpiValor}>{total}</Text>
            <Text style={styles.kpiEtiqueta}>Piezas inspeccionadas</Text>
          </View>
          <View style={styles.kpiCaja}>
            <Text style={styles.kpiValor}>{datos.piezasBuenas}</Text>
            <Text style={styles.kpiEtiqueta}>Piezas buenas</Text>
          </View>
          <View style={styles.kpiCaja}>
            <Text style={styles.kpiValor}>{datos.piezasMalas}</Text>
            <Text style={styles.kpiEtiqueta}>Piezas malas</Text>
          </View>
          <View style={styles.kpiCaja}>
            <Text style={styles.kpiValor}>{porcentajeRechazo.toFixed(1)}%</Text>
            <Text style={styles.kpiEtiqueta}>% Rechazo</Text>
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Pareto de defectos</Text>
          {topDefectos.length === 0 ? (
            <Text>No se registraron defectos.</Text>
          ) : (
            <View>
              {topDefectos.map((d) => (
                <View style={styles.paretoFila} key={d.tipo}>
                  <Text style={styles.paretoEtiqueta}>{d.tipo}</Text>
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
          <Text style={styles.seccionTitulo}>Detalle de defectos</Text>
          {topDefectos.length === 0 ? (
            <Text>No se registraron defectos.</Text>
          ) : (
            <View style={styles.tabla}>
              <View style={styles.tablaFilaHeader}>
                <Text style={[styles.tablaCeldaHeader, { flex: 2 }]}>Tipo de defecto</Text>
                <Text style={styles.tablaCeldaHeader}>Cantidad</Text>
                <Text style={styles.tablaCeldaHeader}>% del total malas</Text>
              </View>
              {topDefectos.map((d) => (
                <View style={styles.tablaFila} key={d.tipo}>
                  <Text style={[styles.tablaCelda, { flex: 2 }]}>{d.tipo}</Text>
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
          <Text style={styles.seccionTitulo}>Cierre</Text>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Cerrado por</Text>
            <Text style={styles.valor}>{datos.cerradoPor ?? "—"}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Fecha y hora de cierre</Text>
            <Text style={styles.valor}>
              {datos.cerradoEn ? new Date(datos.cerradoEn).toLocaleString("es-MX") : "—"}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Generado automáticamente por EQS Control de Inspecciones · {new Date().toLocaleString("es-MX")}
        </Text>
      </Page>
    </Document>
  );
}
