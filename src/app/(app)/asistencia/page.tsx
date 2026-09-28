import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AsistenciaClient from "./AsistenciaClient";

export default async function AsistenciaPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;
  if (!["ADMIN", "SUPERVISOR", "GERENTE", "LIDER"].includes(rol)) redirect("/");
  return <AsistenciaClient puedeEditar={rol !== "GERENTE"} />;
}
