import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { UPLOADS_DIR } from "@/lib/uploads";

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const TIPOS_PERMITIDOS = [...TIPOS_IMAGEN, "application/pdf"];
const TAMANO_MAXIMO_IMAGEN = 20 * 1024 * 1024; // 20MB (fotos de cámara de celular pueden pesar bastante)
const TAMANO_MAXIMO_PDF = 15 * 1024 * 1024; // 15MB

export const dynamic = "force-dynamic";

// Un fallo de disco no es culpa del usuario: se traduce a algo que el Admin pueda
// resolver en Railway en vez de un "error interno" genérico.
function mensajeErrorDisco(error: unknown) {
  const codigo = (error as NodeJS.ErrnoException)?.code;
  if (codigo === "ENOSPC" || codigo === "EDQUOT") {
    return "El almacenamiento de fotos del servidor está lleno. Avisa al administrador.";
  }
  if (codigo === "EACCES" || codigo === "EPERM" || codigo === "EROFS") {
    return "El servidor no tiene permiso para guardar fotos. Avisa al administrador.";
  }
  return `El servidor no pudo guardar la foto (${codigo ?? "error de disco"}). Avisa al administrador.`;
}

// Guarda evidencias fotográficas o instrucciones de trabajo en PDF en disco
// (Railway Volume montado en storage/uploads) y devuelve la URL servida por
// /api/archivos/[archivo] — solo esa URL se guarda en Postgres.
export async function POST(req: NextRequest) {
  try {
    await requerirSesion();

    const form = await req.formData().catch(() => {
      // típico cuando la señal se corta a media subida
      throw new ErrorPermiso("La foto no llegó completa. Revisa tu señal e intenta de nuevo.", 400);
    });
    const archivo = form.get("archivo") ?? form.get("foto");
    if (!(archivo instanceof File)) {
      throw new ErrorPermiso("No se recibió ningún archivo", 400);
    }
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      throw new ErrorPermiso("Formato de archivo no soportado", 400);
    }
    const esPdf = archivo.type === "application/pdf";
    const tamanoMaximo = esPdf ? TAMANO_MAXIMO_PDF : TAMANO_MAXIMO_IMAGEN;
    if (archivo.size > tamanoMaximo) {
      throw new ErrorPermiso(
        `El archivo supera el tamaño máximo de ${tamanoMaximo / (1024 * 1024)}MB`,
        400
      );
    }

    const extension = esPdf ? "pdf" : (archivo.type.split("/")[1] ?? "jpg");
    const nombreArchivo = `${randomUUID()}.${extension}`;
    const rutaCompleta = path.join(UPLOADS_DIR, nombreArchivo);

    const buffer = Buffer.from(await archivo.arrayBuffer());
    try {
      await mkdir(UPLOADS_DIR, { recursive: true });
      await writeFile(rutaCompleta, buffer);
    } catch (error) {
      console.error(`No se pudo guardar el archivo en ${UPLOADS_DIR}`, error);
      throw new ErrorPermiso(mensajeErrorDisco(error), 507);
    }

    const url = `/api/archivos/${nombreArchivo}`;
    return Response.json({ url }, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
