import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
const configurado = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);

if (configurado) {
  webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
}

export type PayloadPush = {
  titulo: string;
  cuerpo: string;
  url?: string;
};

/** Manda una notificación push a todos los dispositivos suscritos de un usuario. */
export async function enviarPush(usuarioId: string, payload: PayloadPush) {
  if (!configurado) return;

  const suscripciones = await prisma.suscripcionPush.findMany({ where: { usuarioId } });
  if (suscripciones.length === 0) return;

  const data = JSON.stringify(payload);

  await Promise.all(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Suscripción vencida o revocada por el navegador: la borramos.
          await prisma.suscripcionPush.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.error("Error enviando push", error);
        }
      }
    })
  );
}
