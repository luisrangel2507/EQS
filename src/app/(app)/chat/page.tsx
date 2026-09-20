import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);
  const rol = session!.user.rol;
  const puedeChatear = rol === "ADMIN" || rol === "SUPERVISOR" || rol === "LIDER";

  if (!puedeChatear) {
    return (
      <div className="card">
        <p className="text-sm text-navy-700">
          El chat es solo para Administradores, Supervisores y Líderes.
        </p>
      </div>
    );
  }

  return <ChatClient miId={session!.user.id} />;
}
