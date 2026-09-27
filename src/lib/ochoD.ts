export const DISCIPLINAS = [
  { clave: "d1Equipo", codigo: "D1", titulo: "Equipo", ayuda: "Quiénes participan y su rol (calidad, producción, cliente, proveedor)." },
  { clave: "d2Problema", codigo: "D2", titulo: "Descripción del problema", ayuda: "Qué, dónde, cuándo y cuánto: número de parte, defecto, cantidad y % afectado." },
  { clave: "d3Contencion", codigo: "D3", titulo: "Contención", ayuda: "Acciones inmediatas para proteger al cliente: sorteo, segregación, identificación de material bueno." },
  { clave: "d4CausaRaiz", codigo: "D4", titulo: "Causa raíz", ayuda: "Por qué ocurrió y por qué no se detectó (5 por qués, Ishikawa)." },
  { clave: "d5Acciones", codigo: "D5", titulo: "Acciones correctivas", ayuda: "Acciones permanentes elegidas para eliminar la causa raíz." },
  { clave: "d6Implementacion", codigo: "D6", titulo: "Implementación y validación", ayuda: "Cómo y cuándo se implementaron, y evidencia de que funcionan." },
  { clave: "d7Prevencion", codigo: "D7", titulo: "Prevención de recurrencia", ayuda: "Cambios a AMEF, plan de control, instrucciones de trabajo o a otros números de parte." },
  { clave: "d8Cierre", codigo: "D8", titulo: "Cierre y reconocimiento", ayuda: "Conclusión, lecciones aprendidas y reconocimiento al equipo." },
] as const;

export type ClaveDisciplina = (typeof DISCIPLINAS)[number]["clave"];

export const avance8D = (r: Partial<Record<ClaveDisciplina, string | null>>) =>
  DISCIPLINAS.filter((d) => (r[d.clave] ?? "").trim().length > 0).length;
