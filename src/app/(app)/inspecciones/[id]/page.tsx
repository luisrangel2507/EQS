import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import InspeccionDetalleClient from "./InspeccionDetalleClient";

export default async function InspeccionDetallePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  return <InspeccionDetalleClient id={params.id} sesion={session!.user} />;
}
