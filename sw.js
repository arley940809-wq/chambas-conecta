const CACHE_NAME = "chambasconecta-v2";

// Archivos esenciales (tu app)
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./chambas-bg.jpg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// 1) Install: cache básico
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// 2) Activate: limpiar caches viejos
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

// 3) Fetch:
// - Misma carpeta (tu app): cache-first + actualiza cache
// - Firebase/CDN/externo: network-first (evita bugs)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // No cachear POST/PUT/DELETE
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // ✅ Tu app (mismo dominio): cache-first
  if (isSameOrigin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        // Fallback offline
        return (await caches.match("./index.html")) || new Response("Offline");
      }
    })());
    return;
  }

  // ✅ Externo (Firebase / gstatic / wa.me, etc.): network-first
  event.respondWith((async () => {
    try {
      return await fetch(req);
    } catch (e) {
      const cached = await caches.match(req);
      return cached || new Response("Offline");
    }
  })());
});
