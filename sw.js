// Service worker: the game works offline after one visit. tools/build.mjs writes this file to /sw.js
// with VERSION set from the built page, so every deploy replaces the old cache.
const VERSION = "d09ed0cb9083";
const CACHE = `moksha-patam-${VERSION}`;
const FONTS = "moksha-patam-fonts";
const CORE = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // The font stylesheets name the font files for this browser, so fetch them now and keep both.
    try {
      const page = await (await cache.match("index.html")).text();
      const sheets = [...page.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/g)].map(m => m[1].replace(/&amp;/g, "&"));
      const fonts = await caches.open(FONTS);
      for (const url of new Set(sheets)) {
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) continue;
        await fonts.put(url, res.clone());
        const files = [...(await res.text()).matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1]);
        await Promise.all(files.map(f => fetch(f, { mode: "cors" }).then(r => r.ok && fonts.put(f, r)).catch(() => {})));
      }
    } catch {}
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE && key !== FONTS) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // Fonts: from the cache when we have them, else from the network and kept.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith((async () => {
      const fonts = await caches.open(FONTS);
      const hit = await fonts.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") fonts.put(req, res.clone());
      return res;
    })());
    return;
  }
  if (url.origin !== location.origin) return;
  // The page and its files: fresh from the network when online, from the cache when not.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req.mode === "navigate" ? "index.html" : req, res.clone());
      return res;
    } catch {
      return (await cache.match(req, { ignoreSearch: true })) || (req.mode === "navigate" && (await cache.match("index.html"))) || Response.error();
    }
  })());
});
