import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import { datosOrganizacion } from "@/lib/organizaciones";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizacionId) redirect("/login");
  const organizacion = await datosOrganizacion(session.user.organizacionId);

  return (
    <AppShell
      id={session.user.id}
      nombre={session.user.nombre}
      rol={session.user.rol}
      organizacion={organizacion}
      superadmin={session.user.superadmin}
    >
      {children}
    </AppShell>
  );
}
