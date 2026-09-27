import { NextRequest } from "next/server";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { respuestaArchivo } from "@/lib/uploads";

export const dynamic = "force-dynamic";

// Sirve fotos de evidencia y PDFs de instrucción de trabajo leyendo el disco
// en cada request (no cacheable como public/, así que sí ve archivos nuevos).
// Requiere sesión: evita exponer las evidencias a cualquiera con el link.
export async function GET(_req: NextRequest, { params }: { params: { archivo: string } }) {
  try {
    await requerirSesion();
    const respuesta = await respuestaArchivo(params.archivo);
    if (!respuesta) throw new ErrorPermiso("Archivo no encontrado", 404);
    return respuesta;
  } catch (error) {
    return manejarErrorApi(error);
  }
}
