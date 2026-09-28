import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const schema = z.object({
  usuarioId: z.string().min(1),
  numeroParte: z.string().min(1),
  accion: z.enum(["otorgar", "revocar"]),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requerirRol("ADMIN", "SUPERVISOR");
    const { usuarioId, numeroParte, accion } = schema.parse(await req.json());
    if (accion === "revocar") {
      await prisma.certificacion.deleteMany({ where: { usuarioId, numeroParte } });
      return Response.json({ ok: true });
    }
    const criterio = await prisma.criterioParte.findFirst({ where: { numeroParte } });
    if (!criterio) throw new ErrorPermiso("Ese número de parte no tiene criterio de certificación", 404);
    const vence = new Date(Date.now() + criterio.vigenciaDias * 86400000);
    const cert = await prisma.certificacion.upsert({
      where: { usuarioId_numeroParte: { usuarioId, numeroParte } },
      create: { usuarioId, numeroParte, metodo: "manual", otorgadaPorId: user.id, vence },
      update: { metodo: "manual", otorgadaPorId: user.id, vence, calificacion: null, creadoEn: new Date() },
    });
    return Response.json(cert);
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
