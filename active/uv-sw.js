importScripts("/active/uv/uv.sw.js");

const sw = new UVServiceWorker();

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  try {
    event.respondWith(sw.fetch(event));
  } catch (err) {
    event.respondWith(fetch(event.request));
  }
});
