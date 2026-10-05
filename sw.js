// Service worker for the Toybox launcher.
// It pre-caches the launcher AND every app's files, so installing Toybox alone
// makes every app available offline. Each app also has its own sw.js for when
// it is installed on its own; inside an app's folder, that app's worker wins.
// Strategy: stale-while-revalidate. Serve the cached copy immediately (works offline),
// and refresh the cache from the network in the background when online.
// After changing any file (or adding an app), bump CACHE and add the app's files to CORE.
const CACHE = "toybox-v14";
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
  "./spin-shop/icons/icon-maskable-512.png",

  // Kaleidoscope
  "./kaleidoscope/",
  "./kaleidoscope/index.html",
  "./kaleidoscope/manifest.webmanifest",
  "./kaleidoscope/icons/icon-180.png",
  "./kaleidoscope/icons/icon-192.png",
  "./kaleidoscope/icons/icon-512.png",
  "./kaleidoscope/icons/icon-maskable-512.png",

  // Fish Tank
  "./fish-tank/",
  "./fish-tank/index.html",
  "./fish-tank/manifest.webmanifest",
  "./fish-tank/icons/icon-180.png",
  "./fish-tank/icons/icon-192.png",
  "./fish-tank/icons/icon-512.png",
  "./fish-tank/icons/icon-maskable-512.png",

  // Peg Drop
  "./peg-drop/",
  "./peg-drop/index.html",
  "./peg-drop/manifest.webmanifest",
  "./peg-drop/icons/icon-180.png",
  "./peg-drop/icons/icon-192.png",
  "./peg-drop/icons/icon-512.png",
  "./peg-drop/icons/icon-maskable-512.png",

  // Rocket Builder
  "./rocket-builder/",
  "./rocket-builder/index.html",
  "./rocket-builder/manifest.webmanifest",
  "./rocket-builder/icons/icon-180.png",
  "./rocket-builder/icons/icon-192.png",
  "./rocket-builder/icons/icon-512.png",
  "./rocket-builder/icons/icon-maskable-512.png",

  // Color Mixing
  "./color-mixing/",
  "./color-mixing/index.html",
  "./color-mixing/manifest.webmanifest",
  "./color-mixing/icons/icon-180.png",
  "./color-mixing/icons/icon-192.png",
  "./color-mixing/icons/icon-512.png",
  "./color-mixing/icons/icon-maskable-512.png",

  // Workshop
  "./workshop/",
  "./workshop/index.html",
  "./workshop/drill-press.html",
  "./workshop/saw-bench.html",
  "./workshop/hammer-screws.html",
  "./workshop/manifest.webmanifest",
  "./workshop/icons/icon-180.png",
  "./workshop/icons/icon-192.png",
  "./workshop/icons/icon-512.png",
  "./workshop/icons/icon-maskable-512.png"
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
