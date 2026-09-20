export const PLANTAS = [
  "Querétaro",
  "Apodaca",
  "Río Bravo",
  "Valle Hermoso",
  "Matamoros",
  "Reynosa",
  "Brownsville",
  "McAllen",
  "Tuscaloosa",
] as const;

// puestos físicos de trabajo; se elige uno al iniciar turno
export const ESTACIONES = [
  "Estación 1",
  "Estación 2",
  "Estación 3",
  "Estación 4",
  "Estación 5",
  "Estación 6",
] as const;

export const ESTADOS_INSPECTOR = [
  { valor: "activo", etiqueta: "🔍 Inspeccionando", color: "bg-green-100 text-green-800" },
  { valor: "material", etiqueta: "📦 Sin material", color: "bg-orange-100 text-orange-800" },
  { valor: "comida", etiqueta: "🍽️ Comiendo", color: "bg-amber-100 text-amber-800" },
  { valor: "bano", etiqueta: "🚻 Baño", color: "bg-blue-100 text-blue-800" },
  { valor: "descanso", etiqueta: "☕ Descanso", color: "bg-purple-100 text-purple-800" },
] as const;

export type EstadoValor = (typeof ESTADOS_INSPECTOR)[number]["valor"];

// minutos de tolerancia antes de generar alerta, por tipo de estado
export const TOLERANCIA_MINUTOS: Record<string, number> = {
  material: 15,
  comida: 30,
  bano: 15,
  descanso: 20,
};

export const UMBRAL_RECHAZO_CRITICO = 0.08; // 8%

export const DEFECTOS_COMUNES = [
  "Rebaba",
  "Rayón / marca superficial",
  "Dimensión fuera de tolerancia",
  "Golpe / abolladura",
  "Falta de pintura / recubrimiento",
  "Contaminación / suciedad",
  "Ensamble incorrecto",
  "Pieza incompleta",
  "Rosca dañada",
  "Otro",
] as const;

// una por día, elegida por fecha para que sea la misma para todos durante el día
// (para Admin, Supervisor, Líder e Inspector)
export const FRASES_DEL_DIA = [
  "El mejor momento para empezar con todo fue ayer. El segundo mejor es ahora.",
  "La calidad no es un acto, es un hábito.",
  "Cada pieza que revisas protege la confianza del cliente en nosotros.",
  "Un defecto detectado a tiempo es un cliente conservado.",
  "La precisión de hoy es la reputación de mañana.",
  "Ningún detalle es demasiado pequeño cuando se trata de calidad.",
  "Hacer las cosas bien la primera vez siempre sale más barato.",
  "Tu atención al detalle es la última línea de defensa antes del cliente.",
  "La constancia vence al talento cuando el talento no es constante.",
  "Un buen turno empieza con una buena actitud.",
] as const;

// misma lógica que FRASES_DEL_DIA, pero para el rol CLIENTE: tono de
// confianza y transparencia en vez de motivación de piso
export const FRASES_DEL_DIA_CLIENTE = [
  "Gracias por la confianza. Tu línea está protegida.",
  "Cada pieza que sale de aquí lleva nuestro compromiso contigo.",
  "Tu calidad es nuestra prioridad, turno tras turno.",
  "Cuidamos cada pieza como si fuera la primera.",
  "Transparencia total: así cuidamos tu producción.",
  "Tu confianza se gana pieza por pieza.",
  "Estamos para proteger la calidad que tu marca merece.",
  "Cada inspección es un compromiso cumplido contigo.",
  "Tu línea, nuestra responsabilidad.",
  "Calidad constante, confianza garantizada.",
] as const;

export const ROLES = ["ADMIN", "SUPERVISOR", "LIDER", "INSPECTOR", "CLIENTE"] as const;

export const ROL_ETIQUETAS: Record<string, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  LIDER: "Líder",
  INSPECTOR: "Inspector",
  CLIENTE: "Cliente",
};
