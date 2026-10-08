import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { datosAnulacion, filaBitacora, leerMotivo, registrar } from "@/lib/bitacora";

export const dynamic = "force-dynamic";

const correccionSchema = z.object({
  entrada: z.string().datetime(),
  salida: z.string().datetime().nullable(),
  nota: z.string().trim().max(500).optional().nullable(),
});

// corrección de una jornada por liderazgo (olvidó checar, se cerró sola, etc.)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirRol("ADMIN", "SUPERVISOR", "LIDER");
    const datos = correccionSchema.parse(await req.json());
    const entrada = new Date(datos.entrada);
    const salida = datos.salida ? new Date(datos.salida) : null;
    if (salida && salida <= entrada) throw new ErrorPermiso("La salida debe ser después de la entrada", 400);
    if (salida && salida.getTime() - entrada.getTime() > 24 * 3600000) {
      throw new ErrorPermiso("Una jornada no puede durar más de 24 horas", 400);
    }
    const previo = await prisma.registroAsistencia.findUnique({ where: { id: params.id } });
    if (!previo) throw new ErrorPermiso("Registro no encontrado", 404);
    const registro = await prisma.registroAsistencia.update({
      where: { id: params.id },
      data: { entrada, salida, nota: datos.nota ?? null, cerradaAuto: false },
    });
    await registrar(user, {
      accion: "EDITAR",
      entidad: "Asistencia",
      entidadId: params.id,
      resumen: "Corrigió una jornada",
      antes: { entrada: previo.entrada, salida: previo.salida, nota: previo.nota },
      despues: { entrada: registro.entrada, salida: registro.salida, nota: registro.nota },
    });
    return Response.json(registro);
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Fechas inválidas" }, { status: 400 });
    return manejarErrorApi(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requerirRol("ADMIN", "SUPERVISOR");
    const motivo = await leerMotivo(req);
    const previo = await prisma.registroAsistencia.findUnique({ where: { id: params.id } });
    if (!previo) throw new ErrorPermiso("Registro no encontrado", 404);
    await prisma.$transaction([
      prisma.registroAsistencia.update({ where: { id: params.id }, data: datosAnulacion(user, motivo) }),
      filaBitacora(user, {
        accion: "ANULAR",
        entidad: "Asistencia",
        entidadId: params.id,
        resumen: "Anuló una jornada",
        antes: { usuarioId: previo.usuarioId, entrada: previo.entrada, salida: previo.salida },
        motivo,
      }),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
