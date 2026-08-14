const CACHE_NAME = "upcoin-pwa-v4";
const basePath = self.location.pathname.replace(/\/service-worker\.js$/, "");
const APP_SHELL = [
  `${basePath}/`,
  `${basePath}/manifest.webmanifest`,
  `${basePath}/pwa-192x192.png`,
  `${basePath}/pwa-512x512.png`,
  `${basePath}/pwa-512x512-maskable.png`,
  `${basePath}/apple-touch-icon.png`,
  `${basePath}/favicon.png`,
  `${basePath}/logo.png`,
];

function cacheResponse(request, response) {
  if (!response || !response.ok) return response;

  const responseCopy = response.clone();
  void caches.open(CACHE_NAME)
    .then((cache) => cache.put(request, responseCopy))
    .catch(() => undefined);

  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(APP_SHELL.map((asset) => cache.add(asset).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("upcoin-pwa-") && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== "GET" || requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.startsWith(`${basePath}/payment/`)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => (requestUrl.pathname === `${basePath}/` || requestUrl.pathname === `${basePath}`) ? cacheResponse(event.request, response) : response)
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          const appShell = await caches.match(`${basePath}/`);
          return cachedPage || appShell || Response.error();
        }),
    );
    return;
  }

  const cacheableDestinations = new Set(["font", "image", "manifest", "script", "style"]);
  if (!cacheableDestinations.has(event.request.destination)) return;

  event.respondWith(caches.match(event.request).then((cachedResponse) => {
    const updatedResponse = fetch(event.request)
      .then((response) => cacheResponse(event.request, response))
      .catch(() => cachedResponse || Response.error());

    return cachedResponse || updatedResponse;
  }));
});
