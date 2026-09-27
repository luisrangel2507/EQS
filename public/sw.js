const CACHE_ESTATICO = "eqs-estatico-v1";
const CACHE_PAGINAS = "eqs-paginas-v1";
const CACHES_VIGENTES = [CACHE_ESTATICO, CACHE_PAGINAS];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((c) => !CACHES_VIGENTES.includes(c)).map((c) => caches.delete(c)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  // al cerrar sesión se borra lo cacheado para que otro usuario del mismo equipo no lo vea
  if (event.data === "limpiar-cache") {
    event.waitUntil(caches.delete(CACHE_PAGINAS));
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/api/publico")) return;

  // assets con hash en el nombre: nunca cambian, se sirven desde caché
  if (url.pathname.startsWith("/_next/static/") || /\.(png|jpg|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_ESTATICO).then(async (cache) => {
        const guardado = await cache.match(req);
        if (guardado) return guardado;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // páginas y lecturas de API: red primero; sin señal, la última copia buena
  const esPagina = req.mode === "navigate";
  const esApiLectura = url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/archivos");
  if (!esPagina && !esApiLectura) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && !res.redirected) {
          const copia = res.clone();
          caches.open(CACHE_PAGINAS).then((cache) => cache.put(req, copia));
        }
        return res;
      })
      .catch(async () => {
        const guardado = await caches.match(req);
        if (guardado) return guardado;
        if (esPagina) {
          return new Response(
            '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;background:#0A163C;color:#fff;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><p style="font-size:48px;margin:0">📡</p><h1>Sin conexión</h1><p>Abre esta pantalla una vez con señal para poder usarla sin conexión.</p></div>',
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
        return Response.json({ error: "Sin conexión" }, { status: 503 });
      })
  );
});

self.addEventListener("push", (event) => {
  let datos = { titulo: "InspeccionAPP", cuerpo: "Tienes una notificación nueva.", url: "/" };
  try {
    if (event.data) datos = { ...datos, ...event.data.json() };
  } catch {
    // payload no era JSON: seguimos con los valores por defecto
  }

  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: "/icon.png",
      badge: "/icon.png",
      data: { url: datos.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.includes(url) && "focus" in cliente) return cliente.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
