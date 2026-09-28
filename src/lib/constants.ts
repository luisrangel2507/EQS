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
  { valor: "activo", emoji: "🔍", etiqueta: "🔍 Inspeccionando", color: "bg-green-100 text-green-800" },
  { valor: "material", emoji: "🚩", etiqueta: "🚩 Sin material", color: "bg-orange-100 text-orange-800" },
  { valor: "comida", emoji: "🍽️", etiqueta: "🍽️ Comiendo", color: "bg-amber-100 text-amber-800" },
  { valor: "bano", emoji: "🚻", etiqueta: "🚻 Baño", color: "bg-blue-100 text-blue-800" },
  { valor: "descanso", emoji: "☕", etiqueta: "☕ Descanso", color: "bg-purple-100 text-purple-800" },
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

export const DEFECTOS_EN: Record<string, string> = {
  Rebaba: "Burr",
  "Rayón / marca superficial": "Scratch / surface mark",
  "Dimensión fuera de tolerancia": "Dimension out of tolerance",
  "Golpe / abolladura": "Dent / damage",
  "Falta de pintura / recubrimiento": "Missing paint / coating",
  "Contaminación / suciedad": "Contamination / dirt",
  "Ensamble incorrecto": "Wrong assembly",
  "Pieza incompleta": "Incomplete part",
  "Rosca dañada": "Damaged thread",
  Otro: "Other",
};

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

export const FRASES_DEL_DIA_CLIENTE_EN = [
  "Thank you for your trust. Your line is protected.",
  "Every part that leaves here carries our commitment to you.",
  "Your quality is our priority, shift after shift.",
  "We treat every part like the first one.",
  "Full transparency: that's how we protect your production.",
  "Your trust is earned one part at a time.",
  "We're here to protect the quality your brand deserves.",
  "Every inspection is a promise kept.",
  "Your line, our responsibility.",
  "Consistent quality, guaranteed confidence.",
] as const;

export const ROLES = ["ADMIN", "SUPERVISOR", "GERENTE", "LIDER", "INSPECTOR", "RESIDENTE", "CLIENTE"] as const;

export const ROL_ETIQUETAS: Record<string, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  GERENTE: "Gerente",
  LIDER: "Líder",
  INSPECTOR: "Inspector",
  RESIDENTE: "Residente",
  CLIENTE: "Cliente",
};

export const ROL_ETIQUETAS_EN: Record<string, string> = {
  ADMIN: "Administrator",
  SUPERVISOR: "Supervisor",
  GERENTE: "Manager",
  LIDER: "Team lead",
  INSPECTOR: "Inspector",
  RESIDENTE: "Resident",
  CLIENTE: "Customer",
};

// "sello" visual por posición: icono + degradado, usado donde se muestra el
// rol como badge (p. ej. la tabla de Usuarios)
export const ROL_SELLO: Record<string, { icono: string; clase: string }> = {
  ADMIN: { icono: "🛡️", clase: "bg-gradient-to-br from-navy-700 to-navy-900 text-white" },
  SUPERVISOR: { icono: "🧭", clase: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white" },
  GERENTE: { icono: "💼", clase: "bg-gradient-to-br from-rose-500 to-pink-600 text-white" },
  LIDER: { icono: "⭐", clase: "bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white" },
  INSPECTOR: { icono: "🔎", clase: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white" },
  RESIDENTE: { icono: "🏭", clase: "bg-gradient-to-br from-orange-500 to-amber-600 text-white" },
  CLIENTE: { icono: "🤝", clase: "bg-gradient-to-br from-slate-500 to-slate-700 text-white" },
};

export const TIPOS_SOLICITUD = ["sorteo", "retrabajo", "inspeccion_recibo", "otro"] as const;

export const TIPO_SOLICITUD_INFO: Record<string, { etiqueta: string; icono: string }> = {
  sorteo: { etiqueta: "Sorteo", icono: "🔍" },
  retrabajo: { etiqueta: "Retrabajo", icono: "🔧" },
  inspeccion_recibo: { etiqueta: "Inspección de recibo", icono: "📦" },
  otro: { etiqueta: "Otro servicio", icono: "📝" },
};

export const URGENCIAS = [
  { valor: "normal", etiqueta: "Normal", clase: "bg-navy-100 text-navy-700" },
  { valor: "urgente", etiqueta: "⚡ Urgente", clase: "bg-amber-100 text-amber-800" },
  { valor: "critica", etiqueta: "🚨 Crítica", clase: "bg-red-100 text-red-800" },
] as const;
