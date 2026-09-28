import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const criterioSchema = z.object({
  numeroParte: z.string().trim().min(1, "Falta el número de parte"),
  descripcion: z.string().trim().min(5, "Describe el criterio de aceptación"),
  fotoOkUrl: z.string().trim().nullable().optional(),
  fotoNgUrl: z.string().trim().nullable().optional(),
  vigenciaDias: z.coerce.number().int().min(7).max(1095).default(365),
  preguntas: z
    .array(
      z
        .object({
          texto: z.string().trim().min(3, "Cada pregunta necesita texto"),
          opciones: z.array(z.string().trim().min(1, "Opción vacía")).min(2, "Mínimo 2 opciones").max(5),
          correcta: z.number().int().min(0),
        })
        .refine((p) => p.correcta < p.opciones.length, { message: "Marca la respuesta correcta" })
    )
    .min(1, "Agrega al menos una pregunta")
    .max(20),
});

export async function POST(req: NextRequest) {
  try {
    await requerirRol("ADMIN", "SUPERVISOR");
    const d = criterioSchema.parse(await req.json());
    const datos = { ...d, fotoOkUrl: d.fotoOkUrl || null, fotoNgUrl: d.fotoNgUrl || null };
    const criterio = await prisma.criterioParte.upsert({
      where: { numeroParte: d.numeroParte },
      create: datos,
      update: datos,
    });
    return Response.json(criterio, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
