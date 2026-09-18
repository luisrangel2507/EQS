import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import UsuariosClient from "./UsuariosClient";

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions);

  if (session?.user.rol !== "ADMIN") {
    return (
      <div className="card">
        <p className="text-sm text-navy-700">
          No tienes permiso para ver esta sección. Solo los administradores pueden gestionar usuarios.
        </p>
      </div>
    );
  }

  return <UsuariosClient usuarioActualId={session.user.id} />;
}
