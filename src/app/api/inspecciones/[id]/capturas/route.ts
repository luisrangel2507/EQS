import { NextRequest } from "next/server";
import { z } from "zod";
import type { Inspeccion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirSesion, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { whereInspeccionesVisibles } from "@/lib/inspecciones";
import { enviarPush } from "@/lib/push";
import { asegurarJornada } from "@/lib/asistencia";

export const dynamic = "force-dynamic";

const capturaSchema = z
  .object({
    tipo: z.enum(["buena", "mala", "retrabajo"]),
    cantidad: z.coerce.number().int().min(1).max(999).optional().default(1),
    defecto: z.string().trim().optional().nullable(),
    fotoUrl: z.string().trim().optional().nullable(),
    idCliente: z.string().trim().max(64).optional().nullable(),
  })
  .refine((d) => d.tipo === "buena" || Boolean(d.defecto), {
    message: "Selecciona el tipo de defecto",
    path: ["defecto"],
  });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirSesion();

    if (user.rol !== "INSPECTOR") {
      throw new ErrorPermiso("Solo el rol Inspector puede capturar inspecciones");
    }

    const inspeccion = await prisma.inspeccion.findFirst({
      where: { id: params.id, ...whereInspeccionesVisibles(user) },
    });
    if (!inspeccion) throw new ErrorPermiso("Inspección no encontrada", 404);
    if (inspeccion.cerrado) throw new ErrorPermiso("La inspección está cerrada", 400);

    const body = await req.json();
    const datos = capturaSchema.parse(body);
    if (datos.idCliente) {
      const repetida = await prisma.captura.findUnique({ where: { idCliente: datos.idCliente } });
      if (repetida) return Response.json(repetida, { status: 200 });
    }

    const cantidad = datos.cantidad;

    // capturar implica estar trabajando: si no marcó entrada en esta pieza, se marca sola
    await asegurarJornada(user.id, params.id).catch((e) => console.error("No se pudo abrir la jornada", e));

    if (datos.tipo === "retrabajo") {
      const resumen = await prisma.defectoResumen.findUnique({
        where: { inspeccionId_tipo: { inspeccionId: params.id, tipo: datos.defecto! } },
      });
      const pendientes = resumen ? resumen.cantidad - resumen.recuperadas : 0;
      if (cantidad > pendientes) {
        throw new ErrorPermiso(
          pendientes > 0
            ? `Solo quedan ${pendientes} pieza(s) NG de "${datos.defecto}" por recuperar`
            : `No hay piezas NG de "${datos.defecto}" por recuperar`,
          400
        );
      }
      const [retrabajo] = await prisma.$transaction([
        prisma.captura.create({
          data: {
            inspeccionId: params.id,
            usuarioId: user.id,
            retrabajadas: cantidad,
            defecto: datos.defecto,
            idCliente: datos.idCliente || null,
          },
        }),
        prisma.inspeccion.update({ where: { id: params.id }, data: { piezasRetrabajadas: { increment: cantidad } } }),
        prisma.defectoResumen.update({
          where: { inspeccionId_tipo: { inspeccionId: params.id, tipo: datos.defecto! } },
          data: { recuperadas: { increment: cantidad } },
        }),
      ]);
      return Response.json(retrabajo, { status: 201 });
    }

    const esBuena = datos.tipo === "buena";

    const [captura] = await prisma.$transaction([
      prisma.captura.create({
        data: {
          inspeccionId: params.id,
          usuarioId: user.id,
          buenas: esBuena ? cantidad : 0,
          malas: esBuena ? 0 : cantidad,
          defecto: esBuena ? null : datos.defecto,
          fotoUrl: datos.fotoUrl || null,
          idCliente: datos.idCliente || null,
        },
      }),
      prisma.inspeccion.update({
        where: { id: params.id },
        data: esBuena
          ? { piezasBuenas: { increment: cantidad } }
          : { piezasMalas: { increment: cantidad } },
      }),
      ...(!esBuena && datos.defecto
        ? [
            prisma.defectoResumen.upsert({
              where: { inspeccionId_tipo: { inspeccionId: params.id, tipo: datos.defecto } },
              create: { inspeccionId: params.id, tipo: datos.defecto, cantidad },
              update: { cantidad: { increment: cantidad } },
            }),
          ]
        : []),
    ]);

    if (!esBuena) {
      try {
        await notificarPiezaNg(inspeccion, datos.defecto ?? "defecto");
      } catch (error) {
        // No dejamos que un fallo al notificar tumbe la captura, que ya se guardó.
        console.error("No se pudo notificar la pieza NG", error);
      }
    }

    return Response.json(captura, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}

// Avisa a los usuarios Cliente de la empresa dueña de la pieza y a Líder
// cuando sale una pieza NG (rechazada), para seguimiento inmediato.
async function notificarPiezaNg(inspeccion: Inspeccion, defecto: string) {
  const identificacion = inspeccion.numeroParte ?? inspeccion.nombre;

  const destinatarios = await prisma.usuario.findMany({
    where: {
      activo: true,
      OR: [
        ...(inspeccion.cliente
          ? [{ rol: "CLIENTE" as const, clienteNombre: inspeccion.cliente }]
          : []),
        { rol: "LIDER" as const },
      ],
    },
    select: { id: true, rol: true },
  });

  if (destinatarios.length === 0) return;

  const mensajePara = (rolDestino: string) =>
    rolDestino === "CLIENTE"
      ? `Se detectó una pieza NG en ${identificacion}: ${defecto}`
      : `⚠️ Pieza NG en ${identificacion}${inspeccion.cliente ? ` (${inspeccion.cliente})` : ""}: ${defecto}`;

  await prisma.notificacion.createMany({
    data: destinatarios.map((d) => ({
      usuarioId: d.id,
      inspeccionId: inspeccion.id,
      tipo: "pieza_ng",
      mensaje: mensajePara(d.rol),
    })),
  });

  await Promise.all(
    destinatarios.map((d) =>
      enviarPush(d.id, {
        titulo: "🔴 Pieza NG detectada",
        cuerpo: mensajePara(d.rol),
        url: `/inspecciones/${inspeccion.id}`,
      }).catch((error) => console.error("No se pudo mandar push", error))
    )
  );
}
