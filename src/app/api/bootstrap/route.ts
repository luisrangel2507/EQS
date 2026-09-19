import { prisma } from "@/lib/prisma";

// Nunca debe pre-renderizarse en build: consulta la base de datos en cada request.
export const dynamic = "force-dynamic";

// Endpoint público: indica si el sistema ya tiene usuarios o si hace falta
// crear el primer Administrador (bootstrap).
export async function GET() {
  const total = await prisma.usuario.count();
  return Response.json({ requiereBootstrap: total === 0 });
}
