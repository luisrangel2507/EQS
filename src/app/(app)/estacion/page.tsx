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

  const abiertas = await prisma.inspeccion.findMany({
    where: { cerrado: false, inspectores: { some: { usuarioId: session!.user.id } } },
    orderBy: { creadoEn: "desc" },
    select: { id: true, nombre: true, numeroParte: true, cliente: true, planta: true },
  });

  // Con una sola pieza abierta asignada, mandamos directo al briefing de esa
  // pieza (qué va a inspeccionar y a qué prestarle atención) sin lista de por medio.
  if (abiertas.length === 1) {
    const detalle = await prisma.inspeccion.findUnique({
      where: { id: abiertas[0].id },
      select: {
        id: true,
        nombre: true,
        numeroParte: true,
        cliente: true,
        planta: true,
        instrucciones: true,
        instruccionesPdfUrl: true,
        defectos: { orderBy: { cantidad: "desc" }, take: 3, select: { tipo: true, cantidad: true } },
      },
    });
    return <EstacionClient nombre={session!.user.nombre} inspecciones={[]} detalleInicial={detalle} />;
  }

  return <EstacionClient nombre={session!.user.nombre} inspecciones={abiertas} detalleInicial={null} />;
}
