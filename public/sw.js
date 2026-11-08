const CACHE_NAME = "hhm-shell-v2";
const SHELL_FILES = [
  "/offline",
  "/icon.svg",
  "/brand/his-and-hers-logo.png",
  "/app-icons/hhm-pwa-192-v2.jpg",
  "/app-icons/hhm-pwa-512-v2.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("hhm-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match("/offline");
        return offline || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
      })
    );
    return;
  }

  if (
    url.pathname === "/brand/his-and-hers-logo.png" ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/app-icons/hhm-pwa-192-v2.jpg" ||
    url.pathname === "/app-icons/hhm-pwa-512-v2.jpg"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});
