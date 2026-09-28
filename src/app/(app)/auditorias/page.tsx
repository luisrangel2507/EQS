import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AuditoriasClient from "./AuditoriasClient";

export default async function AuditoriasPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;
  if (rol === "INSPECTOR") redirect("/");
  return <AuditoriasClient rol={rol} />;
}
