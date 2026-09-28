import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { enlaceVigente, datosPublicos } from "@/lib/compartido";
import { NOMBRE_APP } from "@/lib/branding";
import { traductorServidor } from "@/lib/i18nServidor";
import PortalPublicoClient from "./PortalPublicoClient";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const { t } = traductorServidor();
  return {
    title: `${t("Avance en vivo", "Live progress")} · ${NOMBRE_APP}`,
    robots: { index: false, follow: false },
  };
}

export default async function CompartidoPage({ params }: { params: { token: string } }) {
  const enlace = await enlaceVigente(params.token);
  const datos = enlace ? await datosPublicos(enlace.inspeccionId, params.token) : null;

  if (!enlace || !datos) {
    const { t } = traductorServidor();
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-950 p-6 text-center text-white">
        <div>
          <p className="text-5xl">🔒</p>
          <h1 className="mt-3 font-display text-2xl font-bold">
            {t("Este enlace ya no es válido", "This link is no longer valid")}
          </h1>
          <p className="mt-2 text-white/70">
            {t(
              "Venció o fue revocado. Pide uno nuevo a tu contacto.",
              "It expired or was revoked. Ask your contact for a new one.",
            )}
          </p>
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
