import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { enlaceVigente, datosPublicos } from "@/lib/compartido";
import { NOMBRE_APP } from "@/lib/branding";
import PortalPublicoClient from "./PortalPublicoClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Avance en vivo · ${NOMBRE_APP}`,
  robots: { index: false, follow: false },
};

export default async function CompartidoPage({ params }: { params: { token: string } }) {
  const enlace = await enlaceVigente(params.token);
  const datos = enlace ? await datosPublicos(enlace.inspeccionId, params.token) : null;

  if (!enlace || !datos) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-950 p-6 text-center text-white">
        <div>
          <p className="text-5xl">🔒</p>
          <h1 className="mt-3 font-display text-2xl font-bold">Este enlace ya no es válido</h1>
          <p className="mt-2 text-white/70">Venció o fue revocado. Pide uno nuevo a tu contacto.</p>
        </div>
      </main>
    );
  }

  await prisma.enlaceCompartido.update({
    where: { id: enlace.id },
    data: { vistas: { increment: 1 }, ultimaVista: new Date() },
  });

  return <PortalPublicoClient token={params.token} inicial={datos} />;
}
