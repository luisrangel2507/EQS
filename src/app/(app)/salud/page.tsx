import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SaludClient from "./SaludClient";

export default async function SaludPage() {
  const session = await getServerSession(authOptions);
  if (session!.user.rol !== "ADMIN") redirect("/dashboard");
  return <SaludClient />;
}
