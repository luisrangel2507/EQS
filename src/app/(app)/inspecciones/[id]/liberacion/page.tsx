import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { esLiderazgo } from "@/lib/permissions";
import LiberacionClient from "./LiberacionClient";

export default async function LiberacionPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  return <LiberacionClient id={params.id} puedeAnular={esLiderazgo(session!.user.rol)} />;
}
