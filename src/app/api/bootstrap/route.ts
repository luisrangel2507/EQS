import { prismaGlobal } from "@/lib/prisma";
import { registroAbierto } from "@/lib/organizaciones";

// Nunca debe pre-renderizarse en build: consulta la base de datos en cada request.
export const dynamic = "force-dynamic";

// Endpoint público: indica si el sistema ya tiene usuarios o si hace falta
// crear el primer Administrador (bootstrap).
export async function GET() {
  // cuenta en toda la plataforma: sin sesión, el cliente aislado siempre daría 0
  const total = await prismaGlobal.usuario.count();
  return Response.json({ requiereBootstrap: total === 0, registroAbierto: registroAbierto() });
}
