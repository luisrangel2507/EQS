import { NextRequest } from "next/server";
import { z } from "zod";
import { prismaGlobal } from "@/lib/prisma";
import { requerirSuperadmin, manejarErrorApi } from "@/lib/permissions";
import { contrasenaTemporal, crearOrganizacion } from "@/lib/organizaciones";
import { rangoMes, mesActualLocal } from "@/lib/turnos";

export const dynamic = "force-dynamic";

// Panel del dueño de la plataforma: ve todas las organizaciones (sin filtro de empresa).
export async function GET() {
  try {
    const user = await requerirSuperadmin();
    const { anio, mes } = mesActualLocal();
    const { inicio, fin } = rangoMes(anio, mes);
    const orgs = await prismaGlobal.organizacion.findMany({
      orderBy: { creadoEn: "asc" },
      include: { _count: { select: { usuarios: true, inspecciones: true, empresas: true } } },
    });
    const filas = await Promise.all(
      orgs.map(async (o) => {
        const [activas, piezas, ultima] = await Promise.all([
          prismaGlobal.inspeccion.count({ where: { organizacionId: o.id, cerrado: false } }),
          prismaGlobal.captura.aggregate({
            where: { inspeccion: { organizacionId: o.id }, creadoEn: { gte: inicio, lt: fin } },
            _sum: { buenas: true, malas: true },
          }),
          prismaGlobal.captura.findFirst({
            where: { inspeccion: { organizacionId: o.id } },
            orderBy: { creadoEn: "desc" },
            select: { creadoEn: true },
          }),
        ]);
        return {
          ...o,
          inspeccionesActivas: activas,
          piezasMes: (piezas._sum.buenas ?? 0) + (piezas._sum.malas ?? 0),
          ultimaActividad: ultima?.creadoEn ?? null,
          esLaMia: o.id === user.organizacionId,
        };
      })
    );
    return Response.json(filas);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

const crearSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  nombreCorto: z.string().trim().min(2).max(30),
  admin: z.object({
    nombre: z.string().trim().min(2).max(120),
    usuario: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/, "El usuario solo admite letras, números, punto, guion y guion bajo"),
  }),
});

export async function POST(req: NextRequest) {
  try {
    await requerirSuperadmin();
    const datos = crearSchema.parse(await req.json());
    const password = contrasenaTemporal();
    const org = await crearOrganizacion({ ...datos, admin: { ...datos.admin, password } });
    return Response.json({ id: org.id, nombre: org.nombre, usuario: org.usuarios[0].usuario, password }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
