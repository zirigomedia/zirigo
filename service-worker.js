const CACHE_NAME = "zirigo-cache-v3";

const APP_FILES = [
"./",
"./index.html",
"./styles.css",
"./app.js",
"./config.js",
"./manifest.webmanifest",
"./assets/zirigo-logo.png"
];

self.addEventListener("install", event => {
event.waitUntil((async () => {
const cache = await caches.open(CACHE_NAME);

await cache.addAll(APP_FILES);
await self.skipWaiting();

})());
});

self.addEventListener("activate", event => {
event.waitUntil((async () => {
const keys = await caches.keys();

await Promise.all(
  keys
    .filter(key => key.startsWith("zirigo-cache-") && key !== CACHE_NAME)
    .map(key => caches.delete(key))
);

await self.clients.claim();

})());
});

self.addEventListener("fetch", event => {
if (event.request.method !== "GET") return;

const url = new URL(event.request.url);

if (url.origin !== self.location.origin) return;

event.respondWith((async () => {
try {
const response = await fetch(event.request);

  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(event.request, response.clone());
  }

  return response;
} catch (error) {
  const cached = await caches.match(event.request);

  if (cached) return cached;

  if (event.request.mode === "navigate") {
    return (await caches.match("./index.html")) ||
      Response.error();
  }

  return Response.error();
}

})());
});
