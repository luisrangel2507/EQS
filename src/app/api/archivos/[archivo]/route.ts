import { NextRequest } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { UPLOADS_DIR, mimeParaExtension } from "@/lib/uploads";

export const dynamic = "force-dynamic";

// Sirve fotos de evidencia y PDFs de instrucción de trabajo leyendo el disco
// en cada request (no cacheable como public/, así que sí ve archivos nuevos).
// Requiere sesión: evita exponer las evidencias a cualquiera con el link.
export async function GET(_req: NextRequest, { params }: { params: { archivo: string } }) {
  try {
    await requerirSesion();

    // path.basename evita path traversal (../../etc/passwd, etc.)
    const nombreArchivo = path.basename(params.archivo);
    const rutaCompleta = path.join(UPLOADS_DIR, nombreArchivo);

    if (!rutaCompleta.startsWith(UPLOADS_DIR)) {
      throw new ErrorPermiso("Ruta inválida", 400);
    }

    const info = await stat(rutaCompleta).catch(() => null);
    if (!info || !info.isFile()) {
      throw new ErrorPermiso("Archivo no encontrado", 404);
    }

    const buffer = await readFile(rutaCompleta);
    const extension = nombreArchivo.split(".").pop() ?? "";

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeParaExtension(extension),
        "Content-Length": String(info.size),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
