"use client";

import { useEffect, useState } from "react";

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function esIosNoInstalado() {
  const esIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const enStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return esIos && !enStandalone;
}

export default function PushToggle() {
  const [soportado, setSoportado] = useState(true);
  const [iosSinInstalar, setIosSinInstalar] = useState(false);
  const [suscrito, setSuscrito] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !CLAVE_PUBLICA) {
      setSoportado(false);
      return;
    }
    if (esIosNoInstalado()) {
      setIosSinInstalar(true);
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registro) => registro.pushManager.getSubscription())
      .then((sub) => setSuscrito(Boolean(sub)))
      .catch(() => setSoportado(false));
  }, []);

  async function activar() {
    setCargando(true);
    setError(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setError("No diste permiso de notificaciones en el navegador.");
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      const sub = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(CLAVE_PUBLICA),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setSuscrito(true);
    } catch {
      setError("No se pudo activar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function desactivar() {
    setCargando(true);
    setError(null);
    try {
      const registro = await navigator.serviceWorker.ready;
      const sub = await registro.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSuscrito(false);
    } catch {
      setError("No se pudo desactivar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (iosSinInstalar) {
    return (
      <p className="border-t border-navy-100 px-4 py-2.5 text-xs text-navy-500">
        📲 Para recibir notificaciones, agrega esta app a tu pantalla de inicio (Compartir → Agregar
        a pantalla de inicio) y ábrela desde ahí.
      </p>
    );
  }

  if (!soportado) return null;

  return (
    <div className="border-t border-navy-100">
      <button
        type="button"
        onClick={suscrito ? desactivar : activar}
        disabled={cargando}
        className="block w-full px-4 py-2 text-left text-sm font-semibold text-navy-700 hover:bg-navy-50 disabled:opacity-50"
      >
        {cargando
          ? "Un momento…"
          : suscrito
            ? "🔕 Desactivar notificaciones push"
            : "🔔 Activar notificaciones push"}
      </button>
      {error && <p className="px-4 pb-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
