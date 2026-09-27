import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { obtenerInspeccionVisible } from "@/lib/inspecciones";
import EtiquetaClient from "./EtiquetaClient";

export default async function EtiquetaPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const inspeccion = await obtenerInspeccionVisible(session!.user, params.id);
  if (!inspeccion) notFound();

  return (
    <EtiquetaClient
      id={inspeccion.id}
      nombre={inspeccion.nombre}
      numeroParte={inspeccion.numeroParte}
      cliente={inspeccion.cliente}
      planta={inspeccion.planta}
      puntoLimpio={inspeccion.puntoLimpio}
    />
  );
}
