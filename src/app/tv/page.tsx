import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NOMBRE_CORTO } from "@/lib/branding";
import TvClient from "./TvClient";

export const metadata: Metadata = { title: `Modo TV · ${NOMBRE_CORTO}` };

export default async function TvPage({ searchParams }: { searchParams: { planta?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.rol === "INSPECTOR" || session.user.rol === "CLIENTE") redirect("/");
  return <TvClient plantaInicial={session.user.rol === "RESIDENTE" ? null : searchParams.planta ?? null} puedeElegirPlanta={session.user.rol !== "RESIDENTE"} />;
}
