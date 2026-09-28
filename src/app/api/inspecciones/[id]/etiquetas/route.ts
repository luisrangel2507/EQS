import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { obtenerInspeccionVisible } from "@/lib/inspecciones";
import { generarCodigo, puedeImprimirEtiquetas, saldoLiberable } from "@/lib/etiquetas";

export const dynamic = "force-dynamic";

const MAX_CONTENEDORES = 200;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    const inspeccion = await obtenerInspeccionVisible(user, params.id);
    if (!inspeccion) throw new ErrorPermiso("Inspección no encontrada", 404);
    const [etiquetas, saldo] = await Promise.all([
      prisma.etiquetaLiberacion.findMany({
        where: { inspeccionId: params.id },
        orderBy: [{ creadoEn: "desc" }, { contenedor: "asc" }],
        include: { creadaPor: { select: { nombre: true } } },
      }),
      saldoLiberable(params.id),
    ]);
    return Response.json({
      inspeccion: {
        id: inspeccion.id,
        nombre: inspeccion.nombre,
        numeroParte: inspeccion.numeroParte,
        cliente: inspeccion.cliente,
        planta: inspeccion.planta,
        puntoLimpio: inspeccion.puntoLimpio,
        cerrado: inspeccion.cerrado,
      },
      etiquetas,
      ...saldo,
      puedeImprimir: puedeImprimirEtiquetas(user),
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}

const crearSchema = z.object({
  piezas: z.number().int().min(1),
  porContenedor: z.number().int().min(1),
  lote: z.string().trim().max(80).optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    if (!puedeImprimirEtiquetas(user)) throw new ErrorPermiso("Tu rol no puede liberar material");
    const inspeccion = await obtenerInspeccionVisible(user, params.id);
    if (!inspeccion) throw new ErrorPermiso("Inspección no encontrada", 404);
    const { piezas, porContenedor, lote } = crearSchema.parse(await req.json());

    const total = Math.ceil(piezas / porContenedor);
    if (total > MAX_CONTENEDORES) {
      throw new ErrorPermiso(`Máximo ${MAX_CONTENEDORES} etiquetas por impresión; sube las piezas por contenedor`, 400);
    }
    const { disponibles } = await saldoLiberable(params.id);
    if (piezas > disponibles) {
      throw new ErrorPermiso(
        disponibles === 0
          ? "No hay piezas buenas pendientes de liberar"
          : `Solo hay ${disponibles.toLocaleString("es-MX")} piezas buenas sin etiquetar`,
        400
      );
    }

    const tanda = randomUUID();
    const datos = Array.from({ length: total }, (_, i) => ({
      codigo: generarCodigo(),
      inspeccionId: params.id,
      tanda,
      contenedor: i + 1,
      totalContenedores: total,
      cantidad: i === total - 1 ? piezas - porContenedor * (total - 1) : porContenedor,
      lote: lote || inspeccion.puntoLimpio || null,
      creadaPorId: user.id,
    }));
    await prisma.etiquetaLiberacion.createMany({ data: datos });
    const etiquetas = await prisma.etiquetaLiberacion.findMany({
      where: { tanda },
      orderBy: { contenedor: "asc" },
      include: { creadaPor: { select: { nombre: true } } },
    });
    return Response.json({ tanda, etiquetas }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
