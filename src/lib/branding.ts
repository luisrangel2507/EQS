// Textos de marca centralizados. Al desplegar una instancia separada para
// otro cliente (ver README § "Nueva instancia para otro cliente"), este es
// el único archivo de texto que hace falta editar — los colores viven en
// tailwind.config.js y el logo/imágenes en public/.
export const NOMBRE_CORTO = "InspeccionAPP";
export const NOMBRE_EMPRESA = "EQS";
export const NOMBRE_LEGAL = "Ethical Quality Services";
export const NOMBRE_APP = `${NOMBRE_EMPRESA} ${NOMBRE_CORTO}`;
export const DESCRIPCION_APP = `Control de inspecciones de calidad — ${NOMBRE_LEGAL}`;
export const PIE_PDF = `Generado automáticamente por ${NOMBRE_EMPRESA} Control de Inspecciones`;
