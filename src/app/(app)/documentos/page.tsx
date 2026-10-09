import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { puedeCrearDocumentos, puedeVerDocumentos } from "@/lib/documentos";
import DocumentosClient from "./DocumentosClient";

export default async function DocumentosPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;
  if (!puedeVerDocumentos(rol)) redirect("/dashboard");
  return <DocumentosClient puedeCrear={puedeCrearDocumentos(rol)} />;
}
