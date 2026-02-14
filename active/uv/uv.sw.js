importScripts('/active/uv/uv.bundle.js');
importScripts('/active/uv/uv.config.js');

// Enhanced install event with comprehensive caching strategy
self.addEventListener("install", event => {
  self.skipWaiting(); // Immediate activation
  event.waitUntil(
    caches.open("uv-core-v2").then(cache =>
      cache.addAll([
        "/active/uv/uv.bundle.js",
        "/active/uv/uv.client.js",
        "/active/uv/uv.handler.js",
        "/active/uv/uv.config.js"
      ])
    )
  );
});

// Immediate claim of clients
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

class UVServiceWorker extends EventEmitter {     
    constructor(config = __uv$config) {
        super();
        if (!config.bare) config.bare = '/bare/';
        
        // Pre-parse URLs for faster access
        this.addresses = typeof config.bare === 'string' 
            ? [new URL(config.bare, location)] 
            : config.bare.map(str => new URL(str, location));
        
        // Use Sets for O(1) lookup instead of arrays
        this.headersCSP = new Set([
            'cross-origin-embedder-policy',
            'cross-origin-opener-policy',
            'cross-origin-resource-policy',
            'content-security-policy',
            'content-security-policy-report-only',
            'expect-ct',
            'feature-policy',
            'origin-isolation',
            'strict-transport-security',
            'upgrade-insecure-requests',
            'x-content-type-options',
            'x-download-options',
            'x-frame-options',
            'x-permitted-cross-domain-policies',
            'x-powered-by',
            'x-xss-protection',
        ]);
        
        this.headersForward = new Set([
            'accept-encoding', 
            'connection',
            'content-length',
        ]);
        
        this.methodEmpty = new Set(['GET', 'HEAD']);
        this.statusEmpty = new Set([204, 304]);
        
        this.config = config;
        this.browser = Ultraviolet.Bowser.getParser(self.navigator.userAgent).getBrowserName();

        if (this.browser === 'Firefox') {
            this.headersForward.add('user-agent');
            this.headersForward.add('content-type');
        }
        
        // Cache for parsed URLs
        this.urlCache = new Map();
        this.maxCacheSize = 1000;
        
        // Pre-compile prefix check
        this.prefixOrigin = location.origin + (this.config.prefix || '/service/');
    }
    
    // Optimized URL source extraction with caching
    getCachedSourceUrl(url, ultraviolet) {
        if (this.urlCache.has(url)) {
            return this.urlCache.get(url);
        }
        
        const sourceUrl = ultraviolet.sourceUrl(url);
        
        if (this.urlCache.size >= this.maxCacheSize) {
            const firstKey = this.urlCache.keys().next().value;
            this.urlCache.delete(firstKey);
        }
        
        this.urlCache.set(url, sourceUrl);
        return sourceUrl;
    }
    
    async fetch({ request }) {
        // Fast path rejection for non-proxied requests
        if (!request.url.startsWith(this.prefixOrigin)) {
            return fetch(request);
        }
        
        try {
            const ultraviolet = new Ultraviolet(this.config);

            if (typeof this.config.construct === 'function') {
                this.config.construct(ultraviolet, 'service');
            }

            // Lazy load database only when needed
            const dbPromise = ultraviolet.cookie.db();

            ultraviolet.meta.origin = location.origin;
            const sourceUrl = this.getCachedSourceUrl(request.url, ultraviolet);
            ultraviolet.meta.base = ultraviolet.meta.url = new URL(sourceUrl);

            // Determine if body is needed upfront
            const needsBody = !this.methodEmpty.has(request.method.toUpperCase());
            const bodyPromise = needsBody ? request.blob() : null;

            const requestCtx = new RequestContext(
                request, 
                this, 
                ultraviolet, 
                bodyPromise
            );

            if (ultraviolet.meta.url.protocol === 'blob:') {
                requestCtx.blob = true;
                requestCtx.base = requestCtx.url = new URL(requestCtx.url.pathname);
            }

            // Optimize referrer handling
            if (request.referrer && request.referrer.startsWith(location.origin)) {
                const referer = new URL(this.getCachedSourceUrl(request.referrer, ultraviolet));

                if (requestCtx.headers.origin || (ultraviolet.meta.url.origin !== referer.origin && request.mode === 'cors')) {
                    requestCtx.headers.origin = referer.origin;
                }

                requestCtx.headers.referer = referer.href;
            }

            // Parallel cookie loading
            const db = await dbPromise;
            const cookies = await ultraviolet.cookie.getCookies(db) || [];
            const cookieStr = ultraviolet.cookie.serialize(cookies, ultraviolet.meta, false);

            if (this.browser === 'Firefox' && !(request.destination === 'iframe' || request.destination === 'document')) {
                requestCtx.forward.shift();
            }

            if (cookieStr) requestCtx.headers.cookie = cookieStr;
            requestCtx.headers.Host = requestCtx.url.host;

            // Hook event
            const reqEvent = new HookEvent(requestCtx, null, null);
            this.emit('request', reqEvent);

            if (reqEvent.intercepted) return reqEvent.returnValue;

            // Await body if needed
            if (bodyPromise) {
                requestCtx.body = await bodyPromise;
            }

            // Parallel fetch
            const response = await fetch(requestCtx.send);

            if (response.status === 500) {
                return new Response('Proxy Error', { status: 500 });
            }

            const responseCtx = new ResponseContext(requestCtx, response, this);
            const resEvent = new HookEvent(responseCtx, null, null);

            this.emit('beforemod', resEvent);
            if (resEvent.intercepted) return resEvent.returnValue;

            // Optimized header removal using Set
            for (const name in responseCtx.headers) {
                if (this.headersCSP.has(name)) {
                    delete responseCtx.headers[name];
                }
            }
            
            if (responseCtx.headers.location) {
                responseCtx.headers.location = ultraviolet.rewriteUrl(responseCtx.headers.location);
            }

            // Async cookie handling - don't block response
            if (responseCtx.headers['set-cookie']) {
                ultraviolet.cookie.setCookies(responseCtx.headers['set-cookie'], db, ultraviolet.meta).then(() => {
                    self.clients.matchAll().then(clients => {
                        clients.forEach(client => {
                            client.postMessage({
                                msg: 'updateCookies',
                                url: ultraviolet.meta.url.href,
                            });
                        });
                    });
                });
                delete responseCtx.headers['set-cookie'];
            }

            // Optimized body rewriting with streaming where possible
            if (responseCtx.body) {
                const dest = request.destination;
                
                if (dest === 'script' || dest === 'worker') {
                    const text = await response.text();
                    responseCtx.body = `if (!self.__uv && self.importScripts) importScripts('${__uv$config.bundle}', '${__uv$config.config}', '${__uv$config.handler}');\n` + ultraviolet.js.rewrite(text);
                } else if (dest === 'style') {
                    responseCtx.body = ultraviolet.rewriteCSS(await response.text());
                } else if (dest === 'iframe' || dest === 'document') {
                    if (isHtml(ultraviolet.meta.url, (responseCtx.headers['content-type'] || ''))) {
                        const text = await response.text();
                        responseCtx.body = ultraviolet.rewriteHtml(
                            text, 
                            { 
                                document: true,
                                injectHead: ultraviolet.createHtmlInject(
                                    this.config.handler, 
                                    this.config.bundle, 
                                    this.config.config,
                                    ultraviolet.cookie.serialize(cookies, ultraviolet.meta, true), 
                                    request.referrer
                                )
                            }
                        );
                    }
                }
            }

            if (requestCtx.headers.accept === 'text/event-stream') {
                responseCtx.headers['content-type'] = 'text/event-stream';
            }

            this.emit('response', resEvent);
            if (resEvent.intercepted) return resEvent.returnValue;

            return new Response(responseCtx.body, {
                headers: responseCtx.headers,
                status: responseCtx.status,
                statusText: responseCtx.statusText,
            });

        } catch(err) {
            console.error('UV Fetch Error:', err);
            return new Response(err.toString(), {
                status: 500,
            });
        }
    }
    
    getBarerResponse(response) {
        const headers = {};
        const rawHeaders = response.headers.get('x-bare-headers');
        
        if (rawHeaders) {
            const raw = JSON.parse(rawHeaders);
            for (const key in raw) {
                headers[key.toLowerCase()] = raw[key];
            }
        }

        const status = +response.headers.get('x-bare-status');

        return {
            headers,
            status,
            statusText: response.headers.get('x-bare-status-text'),
            body: !this.statusEmpty.has(status) ? response.body : null,
        };
    }
    
    get address() {
        return this.addresses[Math.floor(Math.random() * this.addresses.length)];
    }
    
    static Ultraviolet = Ultraviolet;
}

self.UVServiceWorker = UVServiceWorker;

class ResponseContext {
    constructor(request, response, worker) {
        const { headers, status, statusText, body } = !request.blob ? worker.getBarerResponse(response) : {
            status: response.status, 
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: response.body,
        };
        this.request = request;
        this.raw = response;
        this.ultraviolet = request.ultraviolet;
        this.headers = headers;
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
    
    get url() {
        return this.request.url;
    }
    
    get base() {
        return this.request.base;
    }
    
    set base(val) {
        this.request.base = val;
    }
}

class RequestContext {
    constructor(request, worker, ultraviolet, body = null) {
        this.ultraviolet = ultraviolet;
        this.request = request;
        this.headers = Object.fromEntries(request.headers.entries());
        this.method = request.method;
        this.forward = Array.from(worker.headersForward);
        this.address = worker.address;
        this.body = body;
        this.redirect = request.redirect;
        this.credentials = 'omit';
        this.mode = request.mode === 'cors' ? request.mode : 'same-origin';
        this.blob = false;
    }
    
    get send() {
        const url = this.url;
        const targetUrl = !this.blob 
            ? this.address.href + 'v1/' 
            : 'blob:' + location.origin + url.pathname;
        
        return new Request(targetUrl, {
            method: this.method,
            headers: {
                'x-bare-protocol': url.protocol,
                'x-bare-host': url.hostname,
                'x-bare-path': url.pathname + url.search,
                'x-bare-port': url.port || (url.protocol === 'https:' ? '443' : '80'),
                'x-bare-headers': JSON.stringify(this.headers),
                'x-bare-forward-headers': JSON.stringify(this.forward),
            },
            redirect: this.redirect,
            credentials: this.credentials,
            mode: location.origin !== this.address.origin ? 'cors' : this.mode,
            body: this.body
        });
    }
    
    get url() {
        return this.ultraviolet.meta.url;
    }
    
    set url(val) {
        this.ultraviolet.meta.url = val;
    }
    
    get base() {
        return this.ultraviolet.meta.base;
    }
    
    set base(val) {
        this.ultraviolet.meta.base = val;
    }
}

function isHtml(url, contentType = '') {
    return (Ultraviolet.mime.contentType((contentType || url.pathname)) || 'text/html').split(';')[0] === 'text/html';
}

class HookEvent {
    #intercepted;
    #returnValue;
    
    constructor(data = {}, target = null, that = null) {
        this.#intercepted = false;
        this.#returnValue = null;
        this.data = data;
        this.target = target;
        this.that = that;
    }
    
    get intercepted() {
        return this.#intercepted;
    }
    
    get returnValue() {
        return this.#returnValue;
    }
    
    respondWith(input) {
        this.#returnValue = input;
        this.#intercepted = true;
    }
}

// Optimized EventEmitter implementation
const R = typeof Reflect === 'object' ? Reflect : null;
const ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  };

const ReflectOwnKeys = R && typeof R.ownKeys === 'function'
  ? R.ownKeys
  : Object.getOwnPropertySymbols
    ? function ReflectOwnKeys(target) {
        return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
      }
    : Object.getOwnPropertyNames;

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

const NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
};

function EventEmitter() {
  EventEmitter.init.call(this);
}

EventEmitter.EventEmitter = EventEmitter;
EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

let defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {
  if (this._events === undefined || this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }
  this._maxListeners = this._maxListeners || undefined;
};

EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  const args = [];
  for (let i = 1; i < arguments.length; i++) args.push(arguments[i]);
  let doError = (type === 'error');

  const events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  if (doError) {
    let er;
    if (args.length > 0) er = args[0];
    if (er instanceof Error) {
      throw er;
    }
    const err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err;
  }

  const handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    const len = handler.length;
    const listeners = arrayClone(handler, len);
    for (let i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  let m;
  let events;
  let existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    if (events.newListener !== undefined) {
      target.emit('newListener', type, listener.listener ? listener.listener : listener);
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      existing = events[type] = prepend ? [listener, existing] : [existing, listener];
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      const w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener = function prependListener(type, listener) {
  return _addListener(this, type, listener, true);
};

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  const state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  const wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
  checkListener(listener);
  this.prependListener(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.removeListener = function removeListener(type, listener) {
  let list, events, position, i, originalListener;

  checkListener(listener);

  events = this._events;
  if (events === undefined) return this;

  list = events[type];
  if (list === undefined) return this;

  if (list === listener || list.listener === listener) {
    if (--this._eventsCount === 0)
      this._events = Object.create(null);
    else {
      delete events[type];
      if (events.removeListener)
        this.emit('removeListener', type, list.listener || listener);
    }
  } else if (typeof list !== 'function') {
    position = -1;

    for (i = list.length - 1; i >= 0; i--) {
      if (list[i] === listener || list[i].listener === listener) {
        originalListener = list[i].listener;
        position = i;
        break;
      }
    }

    if (position < 0) return this;

    if (position === 0)
      list.shift();
    else {
      spliceOne(list, position);
    }

    if (list.length === 1)
      events[type] = list[0];

    if (events.removeListener !== undefined)
      this.emit('removeListener', type, originalListener || listener);
  }

  return this;
};

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
  let listeners, events, i;

  events = this._events;
  if (events === undefined) return this;

  if (events.removeListener === undefined) {
    if (arguments.length === 0) {
      this._events = Object.create(null);
      this._eventsCount = 0;
    } else if (events[type] !== undefined) {
      if (--this._eventsCount === 0)
        this._events = Object.create(null);
      else
        delete events[type];
    }
    return this;
  }

  if (arguments.length === 0) {
    const keys = Object.keys(events);
    let key;
    for (i = 0; i < keys.length; ++i) {
      key = keys[i];
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = Object.create(null);
    this._eventsCount = 0;
    return this;
  }

  listeners = events[type];

  if (typeof listeners === 'function') {
    this.removeListener(type, listeners);
  } else if (listeners !== undefined) {
    for (i = listeners.length - 1; i >= 0; i--) {
      this.removeListener(type, listeners[i]);
    }
  }

  return this;
};

function _listeners(target, type, unwrap) {
  const events = target._events;

  if (events === undefined) return [];

  const evlistener = events[type];
  if (evlistener === undefined) return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;

function listenerCount(type) {
  const events = this._events;

  if (events !== undefined) {
    const evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  const copy = new Array(n);
  for (let i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  const ret = new Array(arr.length);
  for (let i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    }

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    emitter.addEventListener(name, function wrapListener(arg) {
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}
