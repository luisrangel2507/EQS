import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import TurnosClient from "./TurnosClient";

export default async function TurnosPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;
  if (rol === "INSPECTOR" || rol === "CLIENTE") redirect("/dashboard");
  return <TurnosClient rol={rol} miId={session!.user.id} />;
}
