importScripts('/education/school/uv.bundle.js');
importScripts('/education/school/uv.config.js');
importScripts('/education/school/uv.sw.js');
importScripts('https://arc.io/arc-sw-core.js');

const sw = new UVServiceWorker();

self.addEventListener('fetch', (event) => event.respondWith(sw.fetch(event)));
