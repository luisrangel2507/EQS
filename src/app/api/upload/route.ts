import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const TAMANO_MAXIMO = 8 * 1024 * 1024; // 8MB

// Guarda evidencias fotográficas en disco (Railway Volume montado en UPLOADS_DIR,
// servido desde /public/uploads) y devuelve solo la URL para guardar en Postgres.
export async function POST(req: NextRequest) {
  try {
    await requerirSesion();

    const form = await req.formData();
    const archivo = form.get("foto");
    if (!(archivo instanceof File)) {
      throw new ErrorPermiso("No se recibió ningún archivo", 400);
    }
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      throw new ErrorPermiso("Formato de imagen no soportado", 400);
    }
    if (archivo.size > TAMANO_MAXIMO) {
      throw new ErrorPermiso("La imagen supera el tamaño máximo de 8MB", 400);
    }

    // En Railway, monta el Volume exactamente en esta ruta (public/uploads)
    // para que Next.js sirva las fotos como archivos estáticos en /uploads/*.
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const extension = archivo.type.split("/")[1] ?? "jpg";
    const nombreArchivo = `${randomUUID()}.${extension}`;
    const rutaCompleta = path.join(uploadsDir, nombreArchivo);

    const buffer = Buffer.from(await archivo.arrayBuffer());
    await writeFile(rutaCompleta, buffer);

    const url = `/uploads/${nombreArchivo}`;
    return Response.json({ url }, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
