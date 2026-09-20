import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { UPLOADS_DIR } from "@/lib/uploads";

const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const TIPOS_PERMITIDOS = [...TIPOS_IMAGEN, "application/pdf"];
const TAMANO_MAXIMO_IMAGEN = 8 * 1024 * 1024; // 8MB
const TAMANO_MAXIMO_PDF = 15 * 1024 * 1024; // 15MB

export const dynamic = "force-dynamic";

// Guarda evidencias fotográficas o instrucciones de trabajo en PDF en disco
// (Railway Volume montado en storage/uploads) y devuelve la URL servida por
// /api/archivos/[archivo] — solo esa URL se guarda en Postgres.
export async function POST(req: NextRequest) {
  try {
    await requerirSesion();

    const form = await req.formData();
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

    await mkdir(UPLOADS_DIR, { recursive: true });

    const extension = esPdf ? "pdf" : (archivo.type.split("/")[1] ?? "jpg");
    const nombreArchivo = `${randomUUID()}.${extension}`;
    const rutaCompleta = path.join(UPLOADS_DIR, nombreArchivo);

    const buffer = Buffer.from(await archivo.arrayBuffer());
    await writeFile(rutaCompleta, buffer);

    const url = `/api/archivos/${nombreArchivo}`;
    return Response.json({ url }, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
