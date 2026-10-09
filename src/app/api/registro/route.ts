import { NextRequest } from "next/server";
import { z } from "zod";
import { contrasenaSchema } from "@/lib/password";
import { manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { crearOrganizacion, registroAbierto } from "@/lib/organizaciones";

export const dynamic = "force-dynamic";

const schema = z.object({
  empresa: z.string().trim().min(2).max(120),
  nombreCorto: z.string().trim().min(2).max(30),
  nombre: z.string().trim().min(2).max(120),
  usuario: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/, "El usuario solo admite letras, números, punto, guion y guion bajo"),
  password: contrasenaSchema,
});

// Alta pública de una empresa nueva (solo si REGISTRO_ABIERTO=1).
export async function POST(req: NextRequest) {
  try {
    if (!registroAbierto()) throw new ErrorPermiso("El registro está cerrado; pide tu cuenta al administrador", 403);
    const d = schema.parse(await req.json());
    const org = await crearOrganizacion({
      nombre: d.empresa,
      nombreCorto: d.nombreCorto,
      admin: { nombre: d.nombre, usuario: d.usuario, password: d.password },
    });
    return Response.json({ id: org.id, usuario: org.usuarios[0].usuario }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    return manejarErrorApi(error);
  }
}
