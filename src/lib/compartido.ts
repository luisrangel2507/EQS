import { prisma } from "@/lib/prisma";
import { archivoDeUrl } from "@/lib/uploads";

export async function enlaceVigente(token: string) {
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return null;
  const enlace = await prisma.enlaceCompartido.findUnique({ where: { token } });
  if (!enlace || enlace.revocado) return null;
  if (enlace.expiraEn && enlace.expiraEn.getTime() < Date.now()) return null;
  return enlace;
}

/** Datos de solo lectura para el portal público; nunca incluye precios ni datos internos. */
export async function datosPublicos(inspeccionId: string, token: string) {
  const inspeccion = await prisma.inspeccion.findUnique({
    where: { id: inspeccionId },
    select: {
      nombre: true,
      numeroParte: true,
      cliente: true,
      planta: true,
      meta: true,
      fechaEntrega: true,
      piezasBuenas: true,
      piezasMalas: true,
      piezasRetrabajadas: true,
      cerrado: true,
      cerradoEn: true,
      creadoEn: true,
      puntoLimpio: true,
      puntoLimpioOk: true,
      puntoLimpioFotoUrl: true,
      defectos: { orderBy: { cantidad: "desc" }, select: { tipo: true, cantidad: true } },
    },
  });
  if (!inspeccion) return null;

  const [fotos, ultimaCaptura] = await Promise.all([
    prisma.captura.findMany({
      where: { inspeccionId, fotoUrl: { not: null } },
      orderBy: { creadoEn: "desc" },
      take: 60,
      select: { id: true, fotoUrl: true, defecto: true, malas: true, creadoEn: true },
    }),
    prisma.captura.findFirst({
      where: { inspeccionId },
      orderBy: { creadoEn: "desc" },
      select: { creadoEn: true },
    }),
  ]);

  const urlPublica = (url: string | null) => {
    const archivo = archivoDeUrl(url);
    return archivo ? `/api/publico/${token}/archivo/${encodeURIComponent(archivo)}` : null;
  };

  const { puntoLimpioFotoUrl, fechaEntrega, cerradoEn, creadoEn, ...resto } = inspeccion;
  const fotosPublicas: { id: string; url: string; defecto: string | null; cantidad: number; creadoEn: string }[] = [];
  for (const f of fotos) {
    const url = urlPublica(f.fotoUrl);
    if (url) fotosPublicas.push({ id: f.id, url, defecto: f.defecto, cantidad: f.malas, creadoEn: f.creadoEn.toISOString() });
  }
  return {
    ...resto,
    fechaEntrega: fechaEntrega?.toISOString() ?? null,
    cerradoEn: cerradoEn?.toISOString() ?? null,
    creadoEn: creadoEn.toISOString(),
    puntoLimpioFoto: urlPublica(puntoLimpioFotoUrl),
    ultimaActividad: ultimaCaptura?.creadoEn.toISOString() ?? null,
    fotos: fotosPublicas,
  };
}

export type DatosPublicos = NonNullable<Awaited<ReturnType<typeof datosPublicos>>>;
