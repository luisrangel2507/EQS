import path from "path";
import { readFile, stat } from "fs/promises";

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

/** Nombre de archivo seguro dentro de UPLOADS_DIR (evita path traversal), o null. */
export function nombreArchivoSeguro(archivo: string) {
  const nombre = path.basename(archivo);
  const ruta = path.join(UPLOADS_DIR, nombre);
  return ruta.startsWith(UPLOADS_DIR) ? { nombre, ruta } : null;
}

/** Nombre del archivo detrás de una URL /api/archivos/<nombre>. */
export function archivoDeUrl(url: string | null | undefined) {
  const m = url?.match(/\/api\/archivos\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function respuestaArchivo(archivo: string, cache = "private, max-age=31536000, immutable") {
  const seguro = nombreArchivoSeguro(archivo);
  if (!seguro) return null;
  const info = await stat(seguro.ruta).catch(() => null);
  if (!info || !info.isFile()) return null;
  const buffer = await readFile(seguro.ruta);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeParaExtension(seguro.nombre.split(".").pop() ?? ""),
      "Content-Length": String(info.size),
      "Cache-Control": cache,
    },
  });
}
