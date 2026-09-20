import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  // El inspector tiene su propia pantalla de trabajo en "Mis inspecciones";
  // el Dashboard general (KPIs de planta) no aplica a su rol.
  if (session!.user.rol === "INSPECTOR") {
    redirect("/estacion");
  }
  return <DashboardClient rol={session!.user.rol} nombre={session!.user.nombre} />;
}
