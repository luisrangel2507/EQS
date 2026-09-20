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

export const ESTADOS_INSPECTOR = [
  { valor: "activo", etiqueta: "Inspeccionando", color: "bg-green-100 text-green-800" },
  { valor: "material", etiqueta: "Sin material", color: "bg-orange-100 text-orange-800" },
  { valor: "comida", etiqueta: "Comiendo", color: "bg-amber-100 text-amber-800" },
  { valor: "bano", etiqueta: "Baño", color: "bg-blue-100 text-blue-800" },
  { valor: "descanso", etiqueta: "Descanso", color: "bg-purple-100 text-purple-800" },
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

export const ROLES = ["ADMIN", "SUPERVISOR", "LIDER", "INSPECTOR", "CLIENTE"] as const;

export const ROL_ETIQUETAS: Record<string, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  LIDER: "Líder",
  INSPECTOR: "Inspector",
  CLIENTE: "Cliente",
};
