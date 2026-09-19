import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { whereInspeccionesVisibles } from "@/lib/inspecciones";

export const dynamic = "force-dynamic";

function csvEscapar(valor: string) {
  if (/[",\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();
    const inspeccion = await prisma.inspeccion.findFirst({
      where: { id: params.id, ...whereInspeccionesVisibles(user) },
    });
    if (!inspeccion) throw new ErrorPermiso("Inspección no encontrada", 404);

    const capturas = await prisma.captura.findMany({
      where: { inspeccionId: params.id },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { creadoEn: "asc" },
    });

    const encabezado = ["Fecha", "Hora", "Inspector", "Resultado", "Defecto", "Foto"];
    const filas = capturas.map((c) => [
      c.creadoEn.toLocaleDateString("es-MX"),
      c.creadoEn.toLocaleTimeString("es-MX"),
      c.usuario.nombre,
      c.buenas > 0 ? "Buena" : "Mala",
      c.defecto ?? "",
      c.fotoUrl ?? "",
    ]);

    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((v) => csvEscapar(String(v))).join(","))
      .join("\n");

    const bom = "﻿"; // para que Excel detecte UTF-8 correctamente
    const nombreArchivo = `${inspeccion.nombre.replace(/[^a-z0-9]+/gi, "_")}.csv`;

    return new Response(bom + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      },
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
