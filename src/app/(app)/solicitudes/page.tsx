import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SolicitudesClient from "./SolicitudesClient";

export default async function SolicitudesPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;
  if (rol === "INSPECTOR" || rol === "RESIDENTE") redirect("/");
  return <SolicitudesClient rol={rol} />;
}
