import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { esLiderazgo } from "@/lib/permissions";
import DashboardEjecutivoClient from "./DashboardEjecutivoClient";

export default async function DashboardEjecutivoPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;

  if (!esLiderazgo(rol)) {
    return (
      <div className="card">
        <p className="text-sm text-navy-700">
          El Dashboard Ejecutivo es solo para Administradores, Supervisores y Líderes.
        </p>
      </div>
    );
  }

  return <DashboardEjecutivoClient rol={rol} />;
}
