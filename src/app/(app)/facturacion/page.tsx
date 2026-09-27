import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import FacturacionClient from "./FacturacionClient";

export default async function FacturacionPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;
  if (rol !== "ADMIN" && rol !== "GERENTE") redirect("/dashboard");
  return <FacturacionClient />;
}
