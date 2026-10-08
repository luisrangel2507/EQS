import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import BitacoraClient from "./BitacoraClient";

export default async function BitacoraPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;
  if (rol !== "ADMIN" && rol !== "SUPERVISOR" && rol !== "GERENTE") redirect("/dashboard");
  return <BitacoraClient />;
}
