// Offline support: keep the game files cached so it opens like an app.
const CACHE = "footy-fortress-v66";
const SHELL = ["./","index.html","style.css","manifest.webmanifest","art/sheets.js",
  "js/data.js","js/render.js","js/art.js","js/stadium.js","js/game.js","js/battle.js","js/season.js","js/raid.js","js/audio.js","js/ui.js","js/cardset.js","js/cards.js","js/gear.js","js/hubs.js","js/tutorial.js","js/net.js","js/layouts.js","js/install.js",
  "icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Network first so updates show straight away; fall back to the cache when offline.
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, {ignoreSearch:true})));
});
