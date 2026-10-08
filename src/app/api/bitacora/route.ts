import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;
const MAX_CSV = 20000;

function filtros(sp: URLSearchParams): Prisma.BitacoraCambioWhereInput {
  const where: Prisma.BitacoraCambioWhereInput = {};
  const entidad = sp.get("entidad");
  const accion = sp.get("accion");
  const q = sp.get("q")?.trim();
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  if (entidad) where.entidad = entidad;
  if (accion) where.accion = accion;
  if (q) {
    where.OR = [
      { resumen: { contains: q, mode: "insensitive" } },
      { usuarioNombre: { contains: q, mode: "insensitive" } },
      { motivo: { contains: q, mode: "insensitive" } },
      { entidadId: q },
    ];
  }
  const rango: { gte?: Date; lt?: Date } = {};
  if (desde && !Number.isNaN(Date.parse(desde))) rango.gte = new Date(`${desde}T00:00:00`);
  if (hasta && !Number.isNaN(Date.parse(hasta))) {
    const fin = new Date(`${hasta}T00:00:00`);
    fin.setDate(fin.getDate() + 1);
    rango.lt = fin;
  }
  if (rango.gte || rango.lt) where.creadoEn = rango;
  return where;
}

const celda = (v: unknown) => {
  const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
  // evita que Excel ejecute fórmulas escritas por usuarios
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${seguro.replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  try {
    await requerirRol("ADMIN", "SUPERVISOR", "GERENTE");
    const sp = req.nextUrl.searchParams;
    const where = filtros(sp);

    if (sp.get("formato") === "csv") {
      const filas = await prisma.bitacoraCambio.findMany({ where, orderBy: { creadoEn: "desc" }, take: MAX_CSV });
      const encabezado = ["Fecha", "Usuario", "Rol", "Acción", "Entidad", "ID registro", "Resumen", "Motivo", "Antes", "Después", "IP"];
      const lineas = filas.map((f) =>
        [f.creadoEn.toISOString(), f.usuarioNombre, f.usuarioRol, f.accion, f.entidad, f.entidadId, f.resumen, f.motivo, f.antes, f.despues, f.ip]
          .map(celda)
          .join(",")
      );
      const csv = "﻿" + [encabezado.map(celda).join(","), ...lineas].join("\r\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="bitacora-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const pagina = Math.max(1, Number(sp.get("pagina")) || 1);
    const [total, filas] = await Promise.all([
      prisma.bitacoraCambio.count({ where }),
      prisma.bitacoraCambio.findMany({
        where,
        orderBy: { creadoEn: "desc" },
        skip: (pagina - 1) * POR_PAGINA,
        take: POR_PAGINA,
      }),
    ]);
    return Response.json({ total, pagina, porPagina: POR_PAGINA, filas });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
