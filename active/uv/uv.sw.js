"use strict";

/* ===== UV FORM & HANDLER ===== */
const form = document.getElementById("uv-form");
const address = document.getElementById("uv-address");
const searchEngine = document.getElementById("uv-search-engine");
const error = document.getElementById("uv-error");
const errorCode = document.getElementById("uv-error-code");

const isValidUrl = (url) => {
  try { return !!new URL(url); } catch { return false; }
};

async function registerSW(customSW) {
  const stockSW = "/active/uv-sw.js";
  const swAllowedHostnames = ["localhost", "127.0.0.1"];
  if (location.protocol !== "https:" && !swAllowedHostnames.includes(location.hostname)) {
    throw new Error(`Service workers require HTTPS. Current: ${location.protocol}//${location.hostname}`);
  }
  if (!("serviceWorker" in navigator)) throw new Error("Your browser does not support service workers.");
  const swPath = customSW || stockSW;
  try { await navigator.serviceWorker.register(swPath, { scope: __uv$config.prefix }); }
  catch (err) { throw new Error(`Failed to register service worker: ${err}`); }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.textContent = "";
  errorCode.textContent = "";
  const input = address.value.trim();
  if (!input) { error.textContent = "Please enter a URL or search term."; return; }
  const url = searchEngine.value ? search(input, searchEngine.value) : input;
  try {
    await registerSW();
    location.href = __uv$config.prefix + __uv$config.encodeUrl(url);
  } catch (err) {
    error.textContent = "Failed to register service worker.";
    errorCode.textContent = err;
  }
});

const autofill = (url) => { if (!url) return; address.value = url; form.requestSubmit(); };
self.importScripts('/active/uv/uv.bundle.js', '/active/uv/uv.config.js');

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("uv-core").then((cache) => cache.addAll([
      "/active/uv/uv.bundle.js",
      "/active/uv/uv.client.js",
      "/active/uv/uv.handler.js",
      "/active/uv/uv.config.js"
    ]))
  );
});

class UVServiceWorker extends EventEmitter {
  constructor(config = __uv$config) {
    super();
    if (!config.bare) config.bare = '/bare/';
    this.addresses = typeof config.bare === 'string' ? [ new URL(config.bare, location) ] : config.bare.map(str => new URL(str, location));
    this.headers = { csp: [ 'cross-origin-embedder-policy','cross-origin-opener-policy','cross-origin-resource-policy','content-security-policy','content-security-policy-report-only','expect-ct','feature-policy','origin-isolation','strict-transport-security','upgrade-insecure-requests','x-content-type-options','x-download-options','x-frame-options','x-permitted-cross-domain-policies','x-powered-by','x-xss-protection'], forward: ['accept-encoding','connection','content-length'] };
    this.method = { empty: ['GET','HEAD'] };
    this.statusCode = { empty: [204, 304] };
    this.config = config;
    this.browser = Ultraviolet.Bowser.getParser(self.navigator.userAgent).getBrowserName();
    if (this.browser === 'Firefox') { this.headers.forward.push('user-agent','content-type'); }
  }
  async fetch({ request }) {
    if (!request.url.startsWith(location.origin + (this.config.prefix || '/service/'))) return fetch(request);
    try {
      const ultraviolet = new Ultraviolet(this.config);
      if (typeof this.config.construct === 'function') this.config.construct(ultraviolet, 'service');
      const db = await ultraviolet.cookie.db();
      ultraviolet.meta.origin = location.origin;
      ultraviolet.meta.base = ultraviolet.meta.url = new URL(ultraviolet.sourceUrl(request.url));
      const requestCtx = new RequestContext(request, this, ultraviolet, !this.method.empty.includes(request.method.toUpperCase()) ? await request.blob() : null);
      if (ultraviolet.meta.url.protocol === 'blob:') { requestCtx.blob = true; requestCtx.base = requestCtx.url = new URL(requestCtx.url.pathname); }
      if (request.referrer && request.referrer.startsWith(location.origin)) {
        const referer = new URL(ultraviolet.sourceUrl(request.referrer));
        if (requestCtx.headers.origin || ultraviolet.meta.url.origin !== referer.origin && request.mode === 'cors') requestCtx.headers.origin = referer.origin;
        requestCtx.headers.referer = referer.href;
      }
      const cookies = await ultraviolet.cookie.getCookies(db) || [];
      const cookieStr = ultraviolet.cookie.serialize(cookies, ultraviolet.meta, false);
      if (this.browser === 'Firefox' && !(request.destination === 'iframe' || request.destination === 'document')) requestCtx.forward.shift();
      if (cookieStr) requestCtx.headers.cookie = cookieStr;
      requestCtx.headers.Host = requestCtx.url.host;
      const reqEvent = new HookEvent(requestCtx);
      this.emit('request', reqEvent);
      if (reqEvent.intercepted) return reqEvent.returnValue;
      const response = await fetch(requestCtx.send);
      if (response.status === 500) return Promise.reject('');
      const responseCtx = new ResponseContext(requestCtx, response, this);
      const resEvent = new HookEvent(responseCtx);
      this.emit('beforemod', resEvent);
      if (resEvent.intercepted) return resEvent.returnValue;
      for (const name of this.headers.csp) if (responseCtx.headers[name]) delete responseCtx.headers[name];
      if (responseCtx.headers.location) responseCtx.headers.location = ultraviolet.rewriteUrl(responseCtx.headers.location);
      if (responseCtx.headers['set-cookie']) {
        Promise.resolve(ultraviolet.cookie.setCookies(responseCtx.headers['set-cookie'], db, ultraviolet.meta)).then(() => {
          self.clients.matchAll().then(clients => clients.forEach(client => client.postMessage({ msg: 'updateCookies', url: ultraviolet.meta.url.href })));
        });
        delete responseCtx.headers['set-cookie'];
      }
      if (responseCtx.body) {
        switch(request.destination) {
          case 'script':
          case 'worker':
            responseCtx.body = `if (!self.__uv && self.importScripts) importScripts('${__uv$config.bundle}','${__uv$config.config}','${__uv$config.handler}');\n`;
            responseCtx.body += ultraviolet.js.rewrite(await response.text());
            break;
          case 'style':
            responseCtx.body = ultraviolet.rewriteCSS(await response.text());
            break;
          case 'iframe':
          case 'document':
            if (isHtml(ultraviolet.meta.url, (responseCtx.headers['content-type'] || ''))) {
              responseCtx.body = ultraviolet.rewriteHtml(await response.text(), { document: true, injectHead: ultraviolet.createHtmlInject(this.config.handler, this.config.bundle, this.config.config, ultraviolet.cookie.serialize(cookies, ultraviolet.meta, true), request.referrer) });
            }
        }
      }
      if (requestCtx.headers.accept === 'text/event-stream') responseCtx.headers['content-type'] = 'text/event-stream';
      this.emit('response', resEvent);
      if (resEvent.intercepted) return resEvent.returnValue;
      return new Response(responseCtx.body, { headers: responseCtx.headers, status: responseCtx.status, statusText: responseCtx.statusText });
    } catch(err) {
      return new Response(err.toString(), { status: 500 });
    }
  }
  getBarerResponse(response) {
    const headers = {};
    const raw = JSON.parse(response.headers.get('x-bare-headers'));
    for (const key in raw) headers[key.toLowerCase()] = raw[key];
    return { headers, status: +response.headers.get('x-bare-status'), statusText: response.headers.get('x-bare-status-text'), body: !this.statusCode.empty.includes(+response.headers.get('x-bare-status')) ? response.body : null };
  }
  get address() { return this.addresses[Math.floor(Math.random()*this.addresses.length)]; }
  static Ultraviolet = Ultraviolet;
}
self.UVServiceWorker = UVServiceWorker;

function isHtml(url, contentType = '') { return (Ultraviolet.mime.contentType(contentType || url.pathname) || 'text/html').split(';')[0] === 'text/html'; }

class ResponseContext {
  constructor(request, response, worker) {
    const { headers, status, statusText, body } = !request.blob ? worker.getBarerResponse(response) : { status: response.status, statusText: response.statusText, headers: Object.fromEntries([...response.headers.entries()]), body: response.body };
    this.request = request; this.raw = response; this.ultraviolet = request.ultraviolet; this.headers = headers; this.status = status; this.statusText = statusText; this.body = body;
  }
  get url() { return this.request.url; }
  get base() { return this.request.base; }
  set base(val) { this.request.base = val; }
}

class RequestContext {
  constructor(request, worker, ultraviolet, body = null) {
    this.ultraviolet = ultraviolet; this.request = request;
    this.headers = Object.fromEntries([...request.headers.entries()]);
    this.method = request.method; this.forward = [...worker.headers.forward];
    this.address = worker.address; this.body = body || null;
    this.redirect = request.redirect; this.credentials = 'omit';
    this.mode = request.mode === 'cors' ? request.mode : 'same-origin'; this.blob = false;
  }
  get send() { return new Request((!this.blob ? this.address.href+'v1/' : 'blob:'+location.origin+this.url.pathname), { method: this.method, headers: { 'x-bare-protocol': this.url.protocol, 'x-bare-host': this.url.hostname, 'x-bare-path': this.url.pathname+this.url.search, 'x-bare-port': this.url.port || (this.url.protocol==='https:'?'443':'80'), 'x-bare-headers': JSON.stringify(this.headers), 'x-bare-forward-headers': JSON.stringify(this.forward) }, redirect: this.redirect, credentials: this.credentials, mode: location.origin !== this.address.origin ? 'cors' : this.mode, body: this.body }); }
  get url() { return this.ultraviolet.meta.url; } set url(val) { this.ultraviolet.meta.url = val; }
  get base() { return this.ultraviolet.meta.base; } set base(val) { this.ultraviolet.meta.base = val; }
}

class HookEvent { #intercepted; #returnValue; constructor(data = {}, target = null, that = null) { this.#intercepted = false; this.#returnValue = null; this.data = data; this.target = target; this.that = that; } get intercepted() { return this.#intercepted; } get returnValue() { return this.#returnValue; } respondWith(input) { this.#returnValue = input; this.#intercepted = true; } }
