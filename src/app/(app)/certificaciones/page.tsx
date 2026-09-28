import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CertificacionesClient from "./CertificacionesClient";

export default async function CertificacionesPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;
  if (rol === "CLIENTE" || rol === "RESIDENTE") redirect("/");
  return <CertificacionesClient rol={rol} />;
}
