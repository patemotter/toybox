// Retired. The whole Toybox now uses one service worker (the sw.js in the Toybox's top folder,
// registered by common/toybox.js). Older versions installed this per-app worker; inside this folder
// it won over the Toybox-wide one and kept serving an old copy of the app.
// Devices that still have it download this stub on their next visit. The stub:
// - deletes this app's old caches and reloads the open page once, so it shows the newest version;
// - until the new Toybox-wide worker (toybox-v119 or later) runs, serves this folder network first,
//   falling back to the Toybox's cache when offline or when the network takes over NET_WAIT_MS;
// - unregisters itself as soon as that worker runs, so this folder comes under it.
// Keep this file: a device that hasn't opened this app since the change still needs it.
const PREFIX = "bubble-machine-";
const NET_WAIT_MS = 3000;

async function toyboxReady() {
  // The new Toybox-wide worker is running when its cache is the only "toybox-v" cache left.
  const keys = (await caches.keys()).filter((k) => /^toybox-v\d+$/.test(k));
  return keys.length === 1 && Number(keys[0].slice(8)) >= 119;
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith(PREFIX)).map((k) => caches.delete(k)));
    await self.clients.claim();
    if (await toyboxReady()) await self.registration.unregister();
    // The page on screen came from the old worker's cache: load it again (from the network, or
    // through the Toybox-wide worker). This runs once: the reloaded page never brings the old worker back.
    const pages = await self.clients.matchAll({ type: "window" });
    pages.forEach((c) => { c.navigate(c.url).catch(() => { /* the next visit is fresh anyway */ }); });
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    if (req.mode === "navigate" && (await toyboxReady())) event.waitUntil(self.registration.unregister());
    // "no-cache" asks the server every time. A page load is fetched by its address (a redirected answer,
    // e.g. a folder without its trailing slash, is left to the browser to follow).
    const network = req.mode === "navigate"
      ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then((res) => (res.redirected ? fetch(req) : res))
      : fetch(req, { cache: "no-cache" });
    const fallback = () => caches.match(req, { ignoreSearch: true });
    return new Promise((resolve) => {
      let done = false;
      const useCache = async () => {
        if (done) return;
        const cached = await fallback();
        if (done) return;
        if (cached) { done = true; resolve(cached); }
      };
      const timer = setTimeout(useCache, NET_WAIT_MS);
      network.then((res) => { clearTimeout(timer); if (!done) { done = true; resolve(res); } },
        async () => {
          clearTimeout(timer);
          if (done) return;
          const cached = await fallback();
          if (!done) { done = true; resolve(cached || Response.error()); }
        });
    });
  })());
});
