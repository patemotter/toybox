// Service worker for the Toybox launcher.
// It pre-caches the launcher AND every app's files, so installing Toybox alone
// makes every app available offline. Each app also has its own sw.js for when
// it is installed on its own; inside an app's folder, that app's worker wins.
// Strategy: stale-while-revalidate. Serve the cached copy immediately (works offline),
// and refresh the cache from the network in the background when online.
// After changing any file (or adding an app), bump CACHE and add the app's files to CORE.
const CACHE = "toybox-v110";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",

  // Shared (grown-up timer, sound, Big: used by migrated apps)
  "./common/toybox.css",
  "./common/toybox.js",

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

  // Workshop
  "./workshop/",
  "./workshop/index.html",
  "./workshop/drill-press.html",
  "./workshop/saw-bench.html",
  "./workshop/hammer-screws.html",
  "./workshop/lathe.html",
  "./workshop/router-table.html",
  "./workshop/wrenches.html",
  "./workshop/measuring.html",
  "./workshop/shadow-board.html",
  "./workshop/project.html",
  "./workshop/projects.js",
  "./workshop/manifest.webmanifest",
  "./workshop/icons/icon-180.png",
  "./workshop/icons/icon-192.png",
  "./workshop/icons/icon-512.png",
  "./workshop/icons/icon-maskable-512.png",

  // Gear Box
  "./gear-box/",
  "./gear-box/index.html",
  "./gear-box/manifest.webmanifest",
  "./gear-box/icons/icon-180.png",
  "./gear-box/icons/icon-192.png",
  "./gear-box/icons/icon-512.png",
  "./gear-box/icons/icon-maskable-512.png",

  // Marble Run
  "./marble-run/",
  "./marble-run/index.html",
  "./marble-run/manifest.webmanifest",
  "./marble-run/icons/icon-180.png",
  "./marble-run/icons/icon-192.png",
  "./marble-run/icons/icon-512.png",
  "./marble-run/icons/icon-maskable-512.png",

  // Car Builder
  "./car-builder/",
  "./car-builder/index.html",
  "./car-builder/manifest.webmanifest",
  "./car-builder/icons/icon-180.png",
  "./car-builder/icons/icon-192.png",
  "./car-builder/icons/icon-512.png",
  "./car-builder/icons/icon-maskable-512.png",

  // Math Grid
  "./math-grid/",
  "./math-grid/index.html",
  "./math-grid/manifest.webmanifest",
  "./math-grid/icons/icon-180.png",
  "./math-grid/icons/icon-192.png",
  "./math-grid/icons/icon-512.png",
  "./math-grid/icons/icon-maskable-512.png",

  // 3D Printer
  "./3d-printer/",
  "./3d-printer/index.html",
  "./3d-printer/manifest.webmanifest",
  "./3d-printer/icons/icon-180.png",
  "./3d-printer/icons/icon-192.png",
  "./3d-printer/icons/icon-512.png",
  "./3d-printer/icons/icon-maskable-512.png",

  // Water Works
  "./water-works/",
  "./water-works/index.html",
  "./water-works/manifest.webmanifest",
  "./water-works/icons/icon-180.png",
  "./water-works/icons/icon-192.png",
  "./water-works/icons/icon-512.png",
  "./water-works/icons/icon-maskable-512.png",

  // Construction Site
  "./construction-site/",
  "./construction-site/index.html",
  "./construction-site/excavator.html",
  "./construction-site/concrete.html",
  "./construction-site/wrecking-ball.html",
  "./construction-site/tower-crane.html",
  "./construction-site/manifest.webmanifest",
  "./construction-site/icons/icon-180.png",
  "./construction-site/icons/icon-192.png",
  "./construction-site/icons/icon-512.png",
  "./construction-site/icons/icon-maskable-512.png",

  // Train Builder
  "./train-builder/",
  "./train-builder/index.html",
  "./train-builder/manifest.webmanifest",
  "./train-builder/icons/icon-180.png",
  "./train-builder/icons/icon-192.png",
  "./train-builder/icons/icon-512.png",
  "./train-builder/icons/icon-maskable-512.png",

  // Bubbles
  "./bubble-machine/",
  "./bubble-machine/index.html",
  "./bubble-machine/manifest.webmanifest",
  "./bubble-machine/icons/icon-180.png",
  "./bubble-machine/icons/icon-192.png",
  "./bubble-machine/icons/icon-512.png",
  "./bubble-machine/icons/icon-maskable-512.png",

  // Hamster
  "./hamster/",
  "./hamster/index.html",
  "./hamster/manifest.webmanifest",
  "./hamster/icons/icon-180.png",
  "./hamster/icons/icon-192.png",
  "./hamster/icons/icon-512.png",
  "./hamster/icons/icon-maskable-512.png",

  // Garden
  "./garden/",
  "./garden/index.html",
  "./garden/manifest.webmanifest",
  "./garden/icons/icon-180.png",
  "./garden/icons/icon-192.png",
  "./garden/icons/icon-512.png",
  "./garden/icons/icon-maskable-512.png",

  // Spinning Tops
  "./spinning-tops/",
  "./spinning-tops/index.html",
  "./spinning-tops/manifest.webmanifest",
  "./spinning-tops/icons/icon-180.png",
  "./spinning-tops/icons/icon-192.png",
  "./spinning-tops/icons/icon-512.png",
  "./spinning-tops/icons/icon-maskable-512.png",

  // Kitchen
  "./kitchen/",
  "./kitchen/index.html",
  "./kitchen/blender.html",
  "./kitchen/manifest.webmanifest",
  "./kitchen/icons/icon-180.png",
  "./kitchen/icons/icon-192.png",
  "./kitchen/icons/icon-512.png",
  "./kitchen/icons/icon-maskable-512.png",

  // Spirograph
  "./spirograph/",
  "./spirograph/index.html",
  "./spirograph/manifest.webmanifest",
  "./spirograph/icons/icon-180.png",
  "./spirograph/icons/icon-192.png",
  "./spirograph/icons/icon-512.png",
  "./spirograph/icons/icon-maskable-512.png",

  // Jigsaw
  "./jigsaw/",
  "./jigsaw/index.html",
  "./jigsaw/manifest.webmanifest",
  "./jigsaw/icons/icon-180.png",
  "./jigsaw/icons/icon-192.png",
  "./jigsaw/icons/icon-512.png",
  "./jigsaw/icons/icon-maskable-512.png",

  // Sand Table
  "./sand-table/",
  "./sand-table/index.html",
  "./sand-table/manifest.webmanifest",
  "./sand-table/icons/icon-180.png",
  "./sand-table/icons/icon-192.png",
  "./sand-table/icons/icon-512.png",
  "./sand-table/icons/icon-maskable-512.png"
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

// The Grown-ups sheet asks which of CORE is saved on this device ("toybox-offline-check"), or asks to
// fetch whatever is missing first ("toybox-offline-fill"). The answer goes back on the message port.
self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  const port = event.ports && event.ports[0];
  if (!port || (type !== "toybox-offline-check" && type !== "toybox-offline-fill")) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    if (type === "toybox-offline-fill") {
      await Promise.all(CORE.map(async (u) => {
        if (!(await cache.match(u))) { try { await cache.add(u); } catch (e) { /* still offline: stays missing */ } }
      }));
    }
    const missing = [];
    for (const u of CORE) if (!(await cache.match(u))) missing.push(u);
    port.postMessage({ cache: CACHE, total: CORE.length, missing: missing });
  })());
});
