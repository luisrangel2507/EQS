import { prisma } from "@/lib/prisma";
import { requerirSesion, ErrorPermiso, esLiderazgo, type SesionUsuario } from "@/lib/permissions";
import { whereInspeccionesVisibles } from "@/lib/inspecciones";

export async function obtener8DVisible(id: string) {
  const user = await requerirSesion();
  const reporte = await prisma.reporte8D.findFirst({
    where: { id, inspeccion: whereInspeccionesVisibles(user) },
    include: {
      inspeccion: {
        select: { id: true, nombre: true, numeroParte: true, cliente: true, planta: true, piezasBuenas: true, piezasMalas: true },
      },
      creadoPor: { select: { nombre: true } },
    },
  });
  if (!reporte) throw new ErrorPermiso("Reporte 8D no encontrado", 404);
  return { user, reporte };
}

export function exigirEdicion(user: SesionUsuario) {
  if (!esLiderazgo(user.rol)) throw new ErrorPermiso("Solo liderazgo puede editar un 8D");
}

/** Borrador de D1-D3 con lo que ya sabe el sistema; el equipo lo ajusta. */
export async function borrador8D(inspeccionId: string, defecto: string | null, autor: string) {
  const i = await prisma.inspeccion.findUniqueOrThrow({
    where: { id: inspeccionId },
    include: {
      inspectores: { include: { usuario: { select: { nombre: true } } } },
      defectos: true,
    },
  });
  const [primera, ultima] = await Promise.all([
    prisma.captura.findFirst({ where: { inspeccionId, ...(defecto ? { defecto } : {}) }, orderBy: { creadoEn: "asc" } }),
    prisma.captura.findFirst({ where: { inspeccionId, ...(defecto ? { defecto } : {}) }, orderBy: { creadoEn: "desc" } }),
  ]);

  const total = i.piezasBuenas + i.piezasMalas;
  const cantidad = defecto ? (i.defectos.find((d) => d.tipo === defecto)?.cantidad ?? 0) : i.piezasMalas;
  const pct = total > 0 ? ((cantidad / total) * 100).toFixed(2) : "0";
  const fecha = (d?: Date | null) => (d ? d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—");
  const pieza = i.numeroParte ? `número de parte ${i.numeroParte} (${i.nombre})` : i.nombre;

  return {
    d1Equipo: [
      `Líder del 8D: ${autor}`,
      ...i.inspectores.map((a) => `Inspección / sorteo: ${a.usuario.nombre}`),
      i.cliente ? `Cliente: ${i.cliente} (contacto de calidad)` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    d2Problema:
      `Se detectaron ${cantidad} pieza(s) con ${defecto ? `"${defecto}"` : "defectos"} de ${total} inspeccionadas (${pct}%) ` +
      `en ${pieza}${i.cliente ? ` del cliente ${i.cliente}` : ""}${i.planta ? `, planta ${i.planta}` : ""}. ` +
      `Periodo de detección: ${fecha(primera?.creadoEn)} a ${fecha(ultima?.creadoEn)}.`,
    d3Contencion:
      `Sorteo al 100% del material sospechoso en ${i.planta ?? "planta"}; piezas NG segregadas e identificadas.` +
      (i.puntoLimpio ? ` Punto limpio: lote ${i.puntoLimpio}${i.puntoLimpioOk ? " (verificado)" : ""}.` : ""),
  };
}
