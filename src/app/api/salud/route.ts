import { mkdir, readdir, stat, statfs, unlink, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";
import { UPLOADS_DIR } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Chequeo = { ok: boolean; detalle: string };

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(0)} MB`;
const mensaje = (e: unknown) => {
  const err = e as NodeJS.ErrnoException;
  return err?.code ? `${err.code}: ${err.message}` : String(err?.message ?? e);
};

// Diagnóstico para el Admin: lo que hace falta para saber por qué falla algo en
// producción sin tener acceso a los logs de Railway.
export async function GET() {
  try {
    await requerirRol("ADMIN");
    const chequeos: Record<string, Chequeo> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      chequeos.baseDeDatos = { ok: true, detalle: "Conectada" };
    } catch (e) {
      chequeos.baseDeDatos = { ok: false, detalle: mensaje(e) };
    }

    try {
      await prisma.captura.findFirst({ select: { idCliente: true } });
      await prisma.reporte8D.count();
      chequeos.migraciones = { ok: true, detalle: "Tablas y columnas nuevas presentes" };
    } catch (e) {
      chequeos.migraciones = { ok: false, detalle: `Falta aplicar migraciones (prisma migrate deploy): ${mensaje(e)}` };
    }

    try {
      await mkdir(UPLOADS_DIR, { recursive: true });
      const prueba = path.join(UPLOADS_DIR, `.prueba-${Date.now()}`);
      await writeFile(prueba, "ok");
      await unlink(prueba);
      chequeos.escrituraFotos = { ok: true, detalle: `Se puede escribir en ${UPLOADS_DIR}` };
    } catch (e) {
      chequeos.escrituraFotos = { ok: false, detalle: `No se puede escribir en ${UPLOADS_DIR} → ${mensaje(e)}` };
    }

    try {
      const fs = await statfs(UPLOADS_DIR);
      const libre = fs.bavail * fs.bsize;
      const total = fs.blocks * fs.bsize;
      chequeos.espacio = {
        ok: libre > 200 * 1048576,
        detalle: `${mb(libre)} libres de ${mb(total)} (${((1 - libre / total) * 100).toFixed(0)}% usado)`,
      };
    } catch (e) {
      chequeos.espacio = { ok: false, detalle: mensaje(e) };
    }

    try {
      const archivos = await readdir(UPLOADS_DIR);
      let bytes = 0;
      for (const a of archivos) bytes += (await stat(path.join(UPLOADS_DIR, a)).catch(() => ({ size: 0 }))).size;
      chequeos.fotosGuardadas = { ok: true, detalle: `${archivos.length} archivos, ${mb(bytes)}` };
    } catch (e) {
      chequeos.fotosGuardadas = { ok: false, detalle: mensaje(e) };
    }

    return Response.json({
      ok: Object.values(chequeos).every((c) => c.ok),
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      rutaFotos: UPLOADS_DIR,
      chequeos,
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
