export type ItemChecklist = { texto: string; requiereFoto: boolean };
export type Respuesta = { resultado: "ok" | "no" | "na" | null; comentario: string | null; fotoUrl: string | null };

export const TIPOS_AUDITORIA: Record<string, { etiqueta: string; en: string; icono: string }> = {
  capas: { etiqueta: "Auditoría de capas (LPA)", en: "Layered process audit (LPA)", icono: "🧱" },
  "5s": { etiqueta: "5S", en: "5S", icono: "🧹" },
  recibo: { etiqueta: "Inspección de recibo", en: "Receiving inspection", icono: "📦" },
  producto: { etiqueta: "Auditoría de producto", en: "Product audit", icono: "🔍" },
  otro: { etiqueta: "Otro checklist", en: "Other checklist", icono: "📋" },
};

export const itemsDe = (v: unknown): ItemChecklist[] => (Array.isArray(v) ? (v as ItemChecklist[]) : []);
export const respuestasDe = (v: unknown): Respuesta[] => (Array.isArray(v) ? (v as Respuesta[]) : []);

/** % de cumplimiento sobre los ítems aplicables (N/A no cuenta). */
export function calcularPuntaje(respuestas: Respuesta[]) {
  const aplicables = respuestas.filter((r) => r.resultado === "ok" || r.resultado === "no");
  const hallazgos = respuestas.filter((r) => r.resultado === "no").length;
  const puntaje = aplicables.length ? (aplicables.filter((r) => r.resultado === "ok").length / aplicables.length) * 100 : 100;
  return { puntaje, hallazgos };
}

export const PLANTILLAS_EJEMPLO = [
  {
    nombre: "Auditoría de capas – estación de sorteo",
    tipo: "capas",
    descripcion: "Verificación rápida por turno de que la estación trabaja según la instrucción.",
    items: [
      { texto: "La instrucción de trabajo vigente está visible en la estación", requiereFoto: false },
      { texto: "El inspector conoce el criterio de aceptación (se le pregunta)", requiereFoto: false },
      { texto: "Material bueno y NG están separados e identificados", requiereFoto: true },
      { texto: "Las piezas NG tienen etiqueta roja y están en contenedor rojo", requiereFoto: true },
      { texto: "Las capturas en la app coinciden con el conteo físico", requiereFoto: false },
      { texto: "El inspector usa su EPP completo (lentes, guantes, zapato)", requiereFoto: false },
    ],
  },
  {
    nombre: "5S del área de sorteo",
    tipo: "5s",
    descripcion: "Clasificar, ordenar, limpiar, estandarizar y disciplina.",
    items: [
      { texto: "Clasificar: no hay material ni herramientas innecesarias en el área", requiereFoto: true },
      { texto: "Ordenar: cada contenedor tiene su lugar marcado", requiereFoto: true },
      { texto: "Limpiar: piso y mesas sin rebaba, aceite ni basura", requiereFoto: true },
      { texto: "Estandarizar: señalización y etiquetas legibles", requiereFoto: false },
      { texto: "Disciplina: la última auditoría 5S tiene sus pendientes cerrados", requiereFoto: false },
    ],
  },
  {
    nombre: "Inspección de recibo de material",
    tipo: "recibo",
    descripcion: "Revisión del material que llega antes de sortearse.",
    items: [
      { texto: "La cantidad recibida coincide con la remisión", requiereFoto: true },
      { texto: "El empaque llega sin daños", requiereFoto: true },
      { texto: "Las etiquetas del proveedor son legibles (número de parte y lote)", requiereFoto: true },
      { texto: "El lote está identificado para trazabilidad", requiereFoto: false },
    ],
  },
];
