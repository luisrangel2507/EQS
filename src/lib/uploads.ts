import path from "path";

// Carpeta donde se guardan fotos de evidencia e instrucciones en PDF.
// Fuera de public/ a propósito: Next.js cachea la lista de archivos de
// public/ al arrancar el servidor y no detecta archivos escritos después
// en tiempo de ejecución. Se sirve mediante /api/archivos/[archivo].
export const UPLOADS_DIR = path.join(process.cwd(), "storage", "uploads");

const TIPOS_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

export function mimeParaExtension(extension: string): string {
  return TIPOS_MIME[extension.toLowerCase()] ?? "application/octet-stream";
}
