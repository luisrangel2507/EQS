import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso, esLiderazgo } from "@/lib/permissions";
import { PLANTAS, TIPOS_SOLICITUD } from "@/lib/constants";
import { idsPorRol, notificar } from "@/lib/notificar";

export const dynamic = "force-dynamic";

const crearSchema = z.object({
  cliente: z.string().trim().optional(),
  tipo: z.enum(TIPOS_SOLICITUD),
  numeroParte: z.string().trim().min(1, "Escribe el número de parte"),
  descripcion: z.string().trim().min(5, "Describe el problema o lo que necesitas").max(4000),
  cantidad: z.coerce.number().int().min(1).max(10_000_000).optional().nullable(),
  planta: z.enum(PLANTAS).optional().nullable(),
  urgencia: z.enum(["normal", "urgente", "critica"]).default("normal"),
  fotoUrl: z.string().trim().optional().nullable(),
});

export async function GET() {
  try {
    const user = await requerirSesion();
    if (!esLiderazgo(user.rol) && user.rol !== "CLIENTE") throw new ErrorPermiso("Sin acceso a solicitudes");
    const solicitudes = await prisma.solicitudServicio.findMany({
      where: user.rol === "CLIENTE" ? { cliente: user.clienteNombre ?? "__nunca__" } : {},
      orderBy: [{ creadoEn: "desc" }],
      take: 200,
      include: {
        solicitante: { select: { nombre: true } },
        atendidaPor: { select: { nombre: true } },
        inspeccion: { select: { id: true, cerrado: true, piezasBuenas: true, piezasMalas: true } },
      },
    });
    return Response.json(solicitudes);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requerirSesion();
    if (!esLiderazgo(user.rol) && user.rol !== "CLIENTE") throw new ErrorPermiso("Sin acceso a solicitudes");
    const datos = crearSchema.parse(await req.json());

    const cliente = user.rol === "CLIENTE" ? user.clienteNombre : datos.cliente;
    if (!cliente) throw new ErrorPermiso("Indica la empresa cliente", 400);

    const solicitud = await prisma.solicitudServicio.create({
      data: {
        cliente,
        solicitanteId: user.id,
        tipo: datos.tipo,
        numeroParte: datos.numeroParte,
        descripcion: datos.descripcion,
        cantidad: datos.cantidad ?? null,
        planta: datos.planta ?? null,
        urgencia: datos.urgencia,
        fotoUrl: datos.fotoUrl || null,
      },
    });

    const destinatarios = (await idsPorRol("ADMIN", "SUPERVISOR", "GERENTE", "LIDER")).filter((id) => id !== user.id);
    const urgencia = datos.urgencia === "critica" ? "CRÍTICA · " : datos.urgencia === "urgente" ? "Urgente · " : "";
    await notificar(destinatarios, {
      tipo: "solicitud_nueva",
      titulo: "Nueva solicitud de servicio",
      mensaje: `${urgencia}${cliente} pide ${datos.tipo.replace("_", " ")} de ${datos.numeroParte}${
        datos.cantidad ? ` (${datos.cantidad.toLocaleString("es-MX")} pzas)` : ""
      }`,
      url: "/solicitudes",
    }).catch((e) => console.error("No se pudo notificar la solicitud", e));

    return Response.json(solicitud, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
