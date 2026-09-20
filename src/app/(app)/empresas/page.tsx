import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import EmpresasClient from "./EmpresasClient";

export default async function EmpresasPage() {
  const session = await getServerSession(authOptions);

  if (session?.user.rol !== "ADMIN") {
    return (
      <div className="card">
        <p className="text-sm text-navy-700">
          No tienes permiso para ver esta sección. Solo los administradores pueden gestionar empresas.
        </p>
      </div>
    );
  }

  return <EmpresasClient />;
}
