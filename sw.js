// Service worker for the Toybox launcher.
// It pre-caches the launcher AND every app's files, so installing Toybox alone
// makes every app available offline. Each app also has its own sw.js for when
// it is installed on its own; inside an app's folder, that app's worker wins.
// Strategy: stale-while-revalidate. Serve the cached copy immediately (works offline),
// and refresh the cache from the network in the background when online.
// After changing any file (or adding an app), bump CACHE and add the app's files to CORE.
const CACHE = "toybox-v2";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",

  // Spin Shop
  "./spin-shop/",
  "./spin-shop/index.html",
  "./spin-shop/manifest.webmanifest",
  "./spin-shop/icons/icon-180.png",
  "./spin-shop/icons/icon-192.png",
  "./spin-shop/icons/icon-512.png",
  "./spin-shop/icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("toybox-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  // Pages use Google Fonts; cache them too so the look is the same offline.
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: sameOrigin });
      const network = fetch(req)
        .then((res) => {
          // Opaque responses (cross-origin, no-cors) can't be inspected but are safe to cache.
          if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
