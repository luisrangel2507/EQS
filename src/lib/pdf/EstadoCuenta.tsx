import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { EMPRESA_POR_OMISION, type EmpresaEmisora, PIE_PDF } from "@/lib/branding";
import type { LineaFactura } from "@/lib/facturacion";

const NAVY = "#142B6B";
const YELLOW = "#F4D935";

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1A1A1A" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: YELLOW,
    paddingBottom: 12,
    marginBottom: 18,
  },
  logo: { backgroundColor: NAVY, color: "#FFF", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4, fontSize: 16, fontWeight: 700 },
  titulo: { fontSize: 14, fontWeight: 700, color: NAVY },
  sub: { fontSize: 9, color: "#555" },
  bloque: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  etiqueta: { fontSize: 8, color: "#777", textTransform: "uppercase", marginBottom: 2 },
  valor: { fontSize: 12, fontWeight: 700, color: NAVY },
  tabla: { borderWidth: 1, borderColor: "#DDD", borderRadius: 4 },
  filaHeader: { flexDirection: "row", backgroundColor: NAVY },
  fila: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#EEE" },
  celdaH: { padding: 6, color: "#FFF", fontWeight: 700, fontSize: 9 },
  celda: { padding: 6, fontSize: 9 },
  totales: { marginTop: 12, marginLeft: "auto", width: 220 },
  totalFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: NAVY,
    marginTop: 4,
    paddingTop: 6,
  },
  nota: { marginTop: 24, fontSize: 8, color: "#777" },
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

const ANCHOS = [3, 1.3, 1.3, 1.2, 1.4];

const dinero = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

export default function EstadoCuenta({
  cliente,
  periodo,
  lineas,
  tasaIva,
  empresa = EMPRESA_POR_OMISION,
}: {
  cliente: string;
  periodo: string;
  lineas: LineaFactura[];
  tasaIva: number;
  empresa?: EmpresaEmisora;
}) {
  const subtotal = lineas.reduce((acc, l) => acc + l.importe, 0);
  const piezas = lineas.reduce((acc, l) => acc + l.piezas, 0);
  const iva = subtotal * tasaIva;

  return (
    <Document title={`Estado de cuenta ${cliente} ${periodo}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.logo}>{empresa.nombreCorto}</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.titulo}>Estado de cuenta</Text>
            <Text style={s.sub}>{empresa.nombre}</Text>
          </View>
        </View>

        <View style={s.bloque}>
          <View>
            <Text style={s.etiqueta}>Cliente</Text>
            <Text style={s.valor}>{cliente}</Text>
          </View>
          <View>
            <Text style={s.etiqueta}>Periodo</Text>
            <Text style={s.valor}>{periodo}</Text>
          </View>
          <View>
            <Text style={s.etiqueta}>Piezas inspeccionadas</Text>
            <Text style={s.valor}>{piezas.toLocaleString("es-MX")}</Text>
          </View>
        </View>

        <View style={s.tabla}>
          <View style={s.filaHeader}>
            {["Inspección / Número de parte", "Planta", "Cantidad", "Precio", "Importe"].map((t, i) => (
              <Text key={t} style={[s.celdaH, { flex: ANCHOS[i], textAlign: i >= 2 ? "right" : "left" }]}>
                {t}
              </Text>
            ))}
          </View>
          {lineas.map((l) => (
            <View style={s.fila} key={l.id} wrap={false}>
              <Text style={[s.celda, { flex: ANCHOS[0] }]}>
                {l.numeroParte ? `${l.numeroParte} · ` : ""}
                {l.nombre}
              </Text>
              <Text style={[s.celda, { flex: ANCHOS[1] }]}>{l.planta ?? "—"}</Text>
              <Text style={[s.celda, { flex: ANCHOS[2], textAlign: "right" }]}>
                {l.modo === "hora" ? `${l.horas.toFixed(1)} h` : `${l.piezas.toLocaleString("es-MX")} pzas`}
              </Text>
              <Text style={[s.celda, { flex: ANCHOS[3], textAlign: "right" }]}>
                {dinero(l.precio)}/{l.modo === "hora" ? "h" : "pza"}
              </Text>
              <Text style={[s.celda, { flex: ANCHOS[4], textAlign: "right" }]}>{dinero(l.importe)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totales}>
          <View style={s.totalFila}>
            <Text>Subtotal</Text>
            <Text>{dinero(subtotal)}</Text>
          </View>
          <View style={s.totalFila}>
            <Text>IVA ({(tasaIva * 100).toFixed(0)}%)</Text>
            <Text>{dinero(iva)}</Text>
          </View>
          <View style={s.totalFinal}>
            <Text style={{ fontWeight: 700, color: NAVY }}>Total</Text>
            <Text style={{ fontWeight: 700, color: NAVY }}>{dinero(subtotal + iva)}</Text>
          </View>
        </View>

        <Text style={s.nota}>
          Este documento es un estado de cuenta informativo con base en las piezas registradas en el sistema durante
          el periodo. No sustituye al comprobante fiscal (CFDI).
        </Text>

        <Text style={s.footer}>
          {PIE_PDF} · {new Date().toLocaleString("es-MX")}
        </Text>
      </Page>
    </Document>
  );
}
