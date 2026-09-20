import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EstacionClient from "./EstacionClient";

export default async function EstacionPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;

  if (rol !== "INSPECTOR") {
    return (
      <div className="card">
        <p className="text-sm text-navy-700">
          &ldquo;Mis inspecciones&rdquo; es la pantalla de trabajo para inspectores. Tu rol usa el
          Dashboard e Inspecciones normales.
        </p>
      </div>
    );
  }

  // Al entrar, si el inspector solo tiene una pieza abierta asignada, lo mandamos
  // directo a su pantalla de captura (sin pasar por una lista intermedia).
  const abiertas = await prisma.inspeccion.findMany({
    where: { cerrado: false, inspectores: { some: { usuarioId: session!.user.id } } },
    orderBy: { creadoEn: "desc" },
    select: { id: true, nombre: true, numeroParte: true, cliente: true, planta: true },
  });

  if (abiertas.length === 1) {
    redirect(`/inspecciones/${abiertas[0].id}`);
  }

  return <EstacionClient nombre={session!.user.nombre} inspecciones={abiertas} />;
}
