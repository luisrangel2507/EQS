import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { esLiderazgo } from "@/lib/permissions";
import ResidentesClient from "./ResidentesClient";

export default async function ResidentesPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;

  if (!esLiderazgo(rol)) {
    return (
      <div className="card">
        <p className="text-sm text-navy-700">
          El seguimiento de Residentes es solo para Administradores, Supervisores y Líderes.
        </p>
      </div>
    );
  }

  return <ResidentesClient />;
}
