import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import EstacionClient from "./EstacionClient";

export default async function EstacionPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;

  if (rol !== "INSPECTOR") {
    return (
      <div className="card">
        <p className="text-sm text-navy-700">
          &ldquo;Mis inspecciones&rdquo; es la pantalla de trabajo para inspectores. Tu rol usa el
          Dashboard e Inspecciones normales.
        </p>
      </div>
    );
  }

  return <EstacionClient nombre={session!.user.nombre} />;
}
