import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import RankingClient from "./RankingClient";

export default async function RankingPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;
  if (rol === "CLIENTE" || rol === "RESIDENTE") redirect("/dashboard");
  return <RankingClient />;
}
