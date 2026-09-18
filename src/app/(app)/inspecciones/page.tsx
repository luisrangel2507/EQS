import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import InspeccionesClient from "./InspeccionesClient";

export default async function InspeccionesPage() {
  const session = await getServerSession(authOptions);
  return <InspeccionesClient rol={session!.user.rol} />;
}
