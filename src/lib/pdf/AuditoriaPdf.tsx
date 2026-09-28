import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { NOMBRE_EMPRESA, NOMBRE_LEGAL, PIE_PDF, PIE_PDF_EN } from "@/lib/branding";
import { crearT, LOCALES, type Idioma } from "@/lib/i18n";
import { ZONA_HORARIA } from "@/lib/turnos";
import type { ItemChecklist, Respuesta } from "@/lib/auditorias";

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
  resumen: { flexDirection: "row", gap: 10, marginBottom: 14 },
  caja: { flex: 1, borderWidth: 1, borderColor: "#DDD", borderRadius: 4, padding: 8, alignItems: "center" },
  valor: { fontSize: 18, fontWeight: 700, color: NAVY },
  etiqueta: { fontSize: 7, color: "#777", textTransform: "uppercase", marginTop: 2 },
  fila: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#EEE", paddingVertical: 6, gap: 8 },
  num: { width: 18, color: "#999" },
  texto: { flex: 1 },
  res: { width: 70, fontWeight: 700, textAlign: "right" },
  hallazgo: { marginTop: 3, fontSize: 9, color: "#9B1C1C" },
  foto: { width: 150, height: 110, objectFit: "cover", marginTop: 4, borderRadius: 3 },
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

const RESULTADO: Record<string, { texto: string; en: string; color: string }> = {
  ok: { texto: "Cumple", en: "Pass", color: "#047857" },
  no: { texto: "No cumple", en: "Fail", color: "#B91C1C" },
  na: { texto: "N/A", en: "N/A", color: "#6B7280" },
};

export type DatosAuditoriaPdf = {
  folio: number;
  nombrePlantilla: string;
  planta: string | null;
  cliente: string | null;
  area: string | null;
  auditor: string;
  completadaEn: string | null;
  puntaje: number | null;
  hallazgos: number;
  items: ItemChecklist[];
  respuestas: Respuesta[];
  fotos: Record<number, string>; // índice → ruta de archivo en disco
};

export default function AuditoriaPdf({ a, idioma = "es" }: { a: DatosAuditoriaPdf; idioma?: Idioma }) {
  const t = crearT(idioma);
  const fechaHora = (iso: string) => new Date(iso).toLocaleString(LOCALES[idioma], { timeZone: ZONA_HORARIA });
  return (
    <Document title={`${t("Auditoría", "Audit")} ${a.folio}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.logo}>{NOMBRE_EMPRESA}</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.titulo}>{a.nombrePlantilla}</Text>
            <Text style={s.sub}>
              Folio A-{String(a.folio).padStart(4, "0")} · {NOMBRE_LEGAL}
            </Text>
          </View>
        </View>

        <View style={s.resumen}>
          <View style={s.caja}>
            <Text style={s.valor}>{a.puntaje !== null ? `${a.puntaje.toFixed(0)}%` : "—"}</Text>
            <Text style={s.etiqueta}>{t("Cumplimiento", "Compliance")}</Text>
          </View>
          <View style={s.caja}>
            <Text style={s.valor}>{a.hallazgos}</Text>
            <Text style={s.etiqueta}>{t("Hallazgos", "Findings")}</Text>
          </View>
          <View style={[s.caja, { flex: 2, alignItems: "flex-start" }]}>
            <Text style={{ fontSize: 9 }}>
              {t("Auditor", "Auditor")}: {a.auditor}
            </Text>
            <Text style={{ fontSize: 9 }}>
              {t("Fecha", "Date")}: {a.completadaEn ? fechaHora(a.completadaEn) : t("En curso", "In progress")}
            </Text>
            <Text style={{ fontSize: 9 }}>
              {[
                a.planta && `${t("Planta", "Plant")}: ${a.planta}`,
                a.cliente && `${t("Cliente", "Customer")}: ${a.cliente}`,
                a.area && `${t("Área", "Area")}: ${a.area}`,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </Text>
          </View>
        </View>

        {a.items.map((item, i) => {
          const r = a.respuestas[i];
          const res = r?.resultado ? RESULTADO[r.resultado] : { texto: "Sin evaluar", en: "Not evaluated", color: "#999" };
          return (
            <View key={i} style={s.fila} wrap={false}>
              <Text style={s.num}>{i + 1}</Text>
              <View style={s.texto}>
                <Text>{item.texto}</Text>
                {r?.resultado === "no" && r.comentario && <Text style={s.hallazgo}>
                    {t("Hallazgo", "Finding")}: {r.comentario}
                  </Text>}
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                {a.fotos[i] && <Image src={a.fotos[i]} style={s.foto} />}
              </View>
              <Text style={[s.res, { color: res.color }]}>{t(res.texto, res.en)}</Text>
            </View>
          );
        })}

        <Text style={s.footer} fixed>
          {t(PIE_PDF, PIE_PDF_EN)} · {fechaHora(new Date().toISOString())}
        </Text>
      </Page>
    </Document>
  );
}
