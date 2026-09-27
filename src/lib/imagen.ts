"use client";

const LADO_MAXIMO = 2048;
const CALIDAD = 0.82;
const TAMANO_SIN_TOCAR = 1.2 * 1024 * 1024;

async function decodificar(archivo: File) {
  try {
    return await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    // Safari viejo no acepta opciones; la orientación EXIF igual se respeta por defecto
    return await createImageBitmap(archivo);
  }
}

/**
 * Reduce una foto de cámara (4000 px, 3-8 MB) a 2048 px en JPEG antes de subirla:
 * sube en segundos con mala señal y ocupa ~10 veces menos en el almacenamiento.
 * Si el navegador no puede procesarla, devuelve el archivo original.
 */
export async function comprimirImagen(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/")) return archivo;
  try {
    const imagen = await decodificar(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    if (escala === 1 && archivo.size <= TAMANO_SIN_TOCAR && archivo.type === "image/jpeg") {
      imagen.close();
      return archivo;
    }
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close();
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", CALIDAD));
    if (!blob || blob.size >= archivo.size) return archivo;
    const nombre = archivo.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${nombre}.jpg`, { type: "image/jpeg" });
  } catch {
    return archivo;
  }
}
