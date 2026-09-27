import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DESCRIPCION_APP, NOMBRE_APP } from "@/lib/branding";
import Landing from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: `${NOMBRE_APP} · Control de inspecciones en tiempo real`,
  description: DESCRIPCION_APP,
  openGraph: { title: NOMBRE_APP, description: DESCRIPCION_APP, type: "website" },
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect(session.user.rol === "INSPECTOR" ? "/estacion" : "/dashboard");
  return <Landing />;
}
