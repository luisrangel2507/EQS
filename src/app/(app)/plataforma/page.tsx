import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PlataformaClient from "./PlataformaClient";

export default async function PlataformaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user.superadmin) redirect("/dashboard");
  return <PlataformaClient />;
}
