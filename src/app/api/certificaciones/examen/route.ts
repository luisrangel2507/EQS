import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { CALIFICACION_MINIMA, preguntasDe } from "@/lib/certificaciones";

export const dynamic = "force-dynamic";

const examenSchema = z.object({ numeroParte: z.string().min(1), respuestas: z.array(z.number().int()) });

export async function POST(req: NextRequest) {
  try {
    const user = await requerirRol("INSPECTOR");
    const { numeroParte, respuestas } = examenSchema.parse(await req.json());
    const criterio = await prisma.criterioParte.findFirst({ where: { numeroParte } });
    if (!criterio) throw new ErrorPermiso("Ese número de parte no tiene examen", 404);
    const preguntas = preguntasDe(criterio.preguntas);
    if (respuestas.length !== preguntas.length) throw new ErrorPermiso("Responde todas las preguntas", 400);

    const correctas = preguntas.filter((p, i) => p.correcta === respuestas[i]).length;
    const calificacion = Math.round((correctas / preguntas.length) * 100);
    const aprobado = calificacion >= CALIFICACION_MINIMA;
    const vence = new Date(Date.now() + criterio.vigenciaDias * 86400000);

    if (aprobado) {
      await prisma.certificacion.upsert({
        where: { usuarioId_numeroParte: { usuarioId: user.id, numeroParte } },
        create: { usuarioId: user.id, numeroParte, metodo: "examen", calificacion, vence },
        update: { metodo: "examen", calificacion, vence, otorgadaPorId: null, creadoEn: new Date() },
      });
    }
    return Response.json({
      aprobado,
      calificacion,
      correctas,
      total: preguntas.length,
      minima: CALIFICACION_MINIMA,
      vence: aprobado ? vence.toISOString() : null,
      // qué preguntas falló, para que repase; sin revelar la respuesta correcta
      falladas: preguntas.map((p, i) => (p.correcta === respuestas[i] ? null : i)).filter((i) => i !== null),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Respuestas inválidas" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
