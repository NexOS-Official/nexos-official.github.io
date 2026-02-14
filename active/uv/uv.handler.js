if (!self.__uv) {
    __uvHook(self, self.__uv$config, self.__uv$config.bare);
}

async function __uvHook(window, config = {}, bare = '/bare/') {
    if ('__uv' in window && window.__uv instanceof Ultraviolet) return false;

    if (window.document && !!window.window) {
        window.document.querySelectorAll("script[__uv-script]").forEach(node => node.remove());
    }

    const worker = !window.window;
    const master = '__uv';
    const methodPrefix = '__uv$';
    const __uv = new Ultraviolet({
        ...config,
        window,
    });

    if (typeof config.construct === 'function') {
        config.construct(__uv, worker ? 'worker' : 'window');
    }

    const { client } = __uv;
    const {
        HTMLMediaElement,
        HTMLScriptElement,
        HTMLAudioElement,
        HTMLVideoElement,
        HTMLInputElement,
        HTMLEmbedElement,
        HTMLTrackElement,
        HTMLAnchorElement,
        HTMLIFrameElement,
        HTMLAreaElement,
        HTMLLinkElement,
        HTMLBaseElement,
        HTMLFormElement,
        HTMLImageElement,
        HTMLSourceElement,
    } = window;

    // PERFORMANCE BOOST: URL Rewrite Cache with LRU
    const urlCache = new Map();
    const sourceUrlCache = new Map();
    const MAX_CACHE_SIZE = 5000;
    const cssCache = new Map();
    const jsCache = new Map();

    // Fast cache cleanup
    function cleanCache(cache) {
        if (cache.size >= MAX_CACHE_SIZE) {
            const keysToDelete = Array.from(cache.keys()).slice(0, 1000);
            keysToDelete.forEach(key => cache.delete(key));
        }
    }

    // PERFORMANCE: Cached URL rewriting
    const cachedRewriteUrl = (url) => {
        if (typeof url !== 'string') return __uv.rewriteUrl(url);
        if (urlCache.has(url)) return urlCache.get(url);
        
        const rewritten = __uv.rewriteUrl(url);
        urlCache.set(url, rewritten);
        cleanCache(urlCache);
        return rewritten;
    };

    const cachedSourceUrl = (url) => {
        if (typeof url !== 'string') return __uv.sourceUrl(url);
        if (sourceUrlCache.has(url)) return sourceUrlCache.get(url);
        
        const source = __uv.sourceUrl(url);
        sourceUrlCache.set(url, source);
        cleanCache(sourceUrlCache);
        return source;
    };

    // PERFORMANCE: Cached CSS rewriting
    const cachedRewriteCSS = (css, opts) => {
        const key = css.substring(0, 100); // Use first 100 chars as key
        if (cssCache.has(key)) return cssCache.get(key);
        
        const rewritten = __uv.rewriteCSS(css, opts);
        cssCache.set(key, rewritten);
        cleanCache(cssCache);
        return rewritten;
    };

    // PERFORMANCE: Cached JS rewriting
    const cachedRewriteJS = (js) => {
        if (js.length < 50) return __uv.rewriteJS(js); // Don't cache tiny scripts
        const key = js.substring(0, 100);
        if (jsCache.has(key)) return jsCache.get(key);
        
        const rewritten = __uv.rewriteJS(js);
        jsCache.set(key, rewritten);
        cleanCache(jsCache);
        return rewritten;
    };

    client.nativeMethods.defineProperty(window, '__uv', {
        value: __uv,
        enumerable: false,
    });

    __uv.meta.origin = location.origin;
    __uv.location = client.location.emulate(
        (href) => {
            if (href === 'about:srcdoc') return new URL(href);
            if (href.startsWith('blob:')) href = href.slice('blob:'.length);
            return new URL(cachedSourceUrl(href));
        },
        (href) => {
            return cachedRewriteUrl(href);
        },
    );

    __uv.cookieStr = window.__uv$cookies || '';
    __uv.meta.url = __uv.location;
    __uv.domain = __uv.meta.url.host;
    __uv.blobUrls = new window.Map();
    __uv.referrer = '';
    __uv.cookies = [];
    __uv.localStorageObj = {};
    __uv.sessionStorageObj = {};

    try {
        __uv.bare = new URL(bare, window.location.href);
    } catch(e) {
        __uv.bare = window.parent.__uv.bare;
    }

    if (__uv.location.href === 'about:srcdoc') {
        __uv.meta = window.parent.__uv.meta;
    }

    if (window.EventTarget) {
        __uv.addEventListener = window.EventTarget.prototype.addEventListener;
        __uv.removeListener = window.EventTarget.prototype.removeListener;
        __uv.dispatchEvent = window.EventTarget.prototype.dispatchEvent;
    }

    // Storage wrappers
    client.nativeMethods.defineProperty(client.storage.storeProto, '__uv$storageObj', {
        get() {
            if (this === client.storage.sessionStorage) return __uv.sessionStorageObj;
            if (this === client.storage.localStorage) return __uv.localStorageObj;
        },
        enumerable: false,
    });

    // PERFORMANCE: Batch storage operations
    if (window.localStorage) {
        const prefix = methodPrefix + __uv.location.origin + '@';
        const prefixLen = prefix.length;
        
        for (const key in window.localStorage) {
            if (key.startsWith(prefix)) {
                __uv.localStorageObj[key.slice(prefixLen)] = window.localStorage.getItem(key);
            }
        }

        __uv.lsWrap = client.storage.emulate(client.storage.localStorage, __uv.localStorageObj);
    }

    if (window.sessionStorage) {
        const prefix = methodPrefix + __uv.location.origin + '@';
        const prefixLen = prefix.length;
        
        for (const key in window.sessionStorage) {
            if (key.startsWith(prefix)) {
                __uv.sessionStorageObj[key.slice(prefixLen)] = window.sessionStorage.getItem(key);
            }
        }

        __uv.ssWrap = client.storage.emulate(client.storage.sessionStorage, __uv.sessionStorageObj);
    }

    let rawBase = window.document ? client.node.baseURI.get.call(window.document) : window.location.href;
    let base = cachedSourceUrl(rawBase);

    client.nativeMethods.defineProperty(__uv.meta, 'base', {
        get() {
            if (!window.document) return __uv.meta.url.href;

            const currentBase = client.node.baseURI.get.call(window.document);
            if (currentBase !== rawBase) {
                rawBase = currentBase;
                base = cachedSourceUrl(rawBase);
            }

            return base;
        },
    });

    __uv.methods = {
        setSource: methodPrefix + 'setSource',
        source: methodPrefix + 'source',
        location: methodPrefix + 'location',
        function: methodPrefix + 'function',
        string: methodPrefix + 'string',
        eval: methodPrefix + 'eval',
        parent: methodPrefix + 'parent',
        top: methodPrefix + 'top',
    };

    __uv.filterKeys = [
        master,
        __uv.methods.setSource,
        __uv.methods.source,
        __uv.methods.location,
        __uv.methods.function,
        __uv.methods.string,
        __uv.methods.eval,
        __uv.methods.parent,
        __uv.methods.top,
        methodPrefix + 'protocol',
        methodPrefix + 'storageObj',
        methodPrefix + 'url',
        methodPrefix + 'modifiedStyle',
        methodPrefix + 'config',
        methodPrefix + 'dispatched',
        'Ultraviolet',
        '__uvHook',
    ];

    client.on('wrap', (target, wrapped) => {
        client.nativeMethods.defineProperty(wrapped, 'name', client.nativeMethods.getOwnPropertyDescriptor(target, 'name'));
        client.nativeMethods.defineProperty(wrapped, 'length', client.nativeMethods.getOwnPropertyDescriptor(target, 'length'));

        client.nativeMethods.defineProperty(wrapped, __uv.methods.string, {
            enumerable: false,
            value: client.nativeMethods.fnToString.call(target),
        });

        client.nativeMethods.defineProperty(wrapped, __uv.methods.function, {
            enumerable: false,
            value: target,
        });
    });

    // PERFORMANCE: Use cached URL functions
    client.fetch.on('request', event => {
        event.data.input = cachedRewriteUrl(event.data.input);
    });

    client.fetch.on('requestUrl', event => {
        event.data.value = cachedSourceUrl(event.data.value);
    });

    client.fetch.on('responseUrl', event => {
        event.data.value = cachedSourceUrl(event.data.value);
    });

    // XMLHttpRequest
    client.xhr.on('open', event => {
        event.data.input = cachedRewriteUrl(event.data.input);
    });

    client.xhr.on('responseUrl', event => {
        event.data.value = cachedSourceUrl(event.data.value);
    });

    // Workers
    client.workers.on('worker', event => {
        event.data.url = cachedRewriteUrl(event.data.url);
    });

    client.workers.on('addModule', event => {
        event.data.url = cachedRewriteUrl(event.data.url);
    });

    client.workers.on('importScripts', event => {
        for (const i in event.data.scripts) {
            event.data.scripts[i] = cachedRewriteUrl(event.data.scripts[i]);
        }
    });

    client.workers.on('postMessage', event => {
        let to = event.data.origin;

        event.data.origin = '*';
        event.data.message = {
            __data: event.data.message,
            __origin: __uv.meta.url.origin,
            __to: to,
        };
    });

    // Navigator
    client.navigator.on('sendBeacon', event => {
        event.data.url = cachedRewriteUrl(event.data.url);
    });

    // PERFORMANCE: Optimized cookie handling
    let cookieUpdatePending = false;
    const updateCookieStr = () => {
        if (cookieUpdatePending) return;
        cookieUpdatePending = true;
        
        requestIdleCallback(() => {
            __uv.cookie.db().then(db => {
                __uv.cookie.getCookies(db).then(cookies => {
                    __uv.cookieStr = __uv.cookie.serialize(cookies, __uv.meta, true);
                    cookieUpdatePending = false;
                });
            });
        }, { timeout: 100 });
    };

    client.document.on('getCookie', event => {
        event.data.value = __uv.cookieStr;
    });

    client.document.on('setCookie', event => {
        // Async cookie setting - don't block
        Promise.resolve(__uv.cookie.setCookies(event.data.value, __uv.db, __uv.meta)).then(updateCookieStr);
        
        const cookie = __uv.cookie.setCookie(event.data.value)[0];

        if (!cookie.path) cookie.path = '/';
        if (!cookie.domain) cookie.domain = __uv.meta.url.hostname;

        if (__uv.cookie.validateCookie(cookie, __uv.meta, true)) {
            if (__uv.cookieStr.length) __uv.cookieStr += '; ';
            __uv.cookieStr += `${cookie.name}=${cookie.value}`;
        }

        event.respondWith(event.data.value);
    });

    // PERFORMANCE: Optimized message handling
    client.message.on('postMessage', event => {
        let to = event.data.origin;
        let call = event.target.call;

        event.data.origin = '*';
        event.data.message = {
            __data: event.data.message,
            __origin: __uv.meta.url.origin,
            __to: to,
        };

        event.target.call = [event.that, event.data.message, event.data.target, [...event.data.transfer]];
    });

    client.message.on('data', event => {
        const data = event.data.value;
        if (typeof data === 'object' && data && '__data' in data) {
            event.data.value = data.__data;
        }
    });

    client.message.on('origin', event => {
        const data = event.data.msg.data;
        if (typeof data === 'object' && data && '__origin' in data) {
            event.data.value = data.__origin;
        }
    });

    client.overrideDescriptor(window, 'origin', {
        get: (target, that) => {
            return __uv.meta.url.origin;
        },
    });

    // PERFORMANCE: Cached attribute checks
    const rewriteAttrs = new Set(['src', 'href', 'data', 'action', 'formaction', 'poster']);
    const sourceAttrs = new Set(['srcdoc', 'srcset']);

    client.node.on('getTextContent', event => {
        if (event.that instanceof HTMLScriptElement) {
            event.data.value = cachedSourceUrl(event.data.value);
        }
    });

    client.node.on('setTextContent', event => {
        if (event.that instanceof HTMLScriptElement) {
            event.data.value = __uv.rewriteJS(event.data.value);
        }
    });

    // PERFORMANCE: Optimized attribute handling
    client.attribute.on('getValue', event => {
        const attr = event.data.name.toLowerCase();
        
        if (rewriteAttrs.has(attr)) {
            event.data.value = cachedSourceUrl(event.data.value);
        } else if (attr === 'integrity') {
            event.data.value = '';
        } else if (sourceAttrs.has(attr)) {
            event.data.value = __uv.sourceHtml(event.data.value, __uv.meta);
        }
    });

    client.attribute.on('setValue', event => {
        const attr = event.data.name.toLowerCase();
        
        if (rewriteAttrs.has(attr)) {
            event.data.value = cachedRewriteUrl(event.data.value);
        } else if (attr === 'integrity') {
            event.data.value = '';
        } else if (sourceAttrs.has(attr)) {
            event.data.value = __uv.rewriteHtml(event.data.value, {...__uv.meta});
        }
    });

    // PERFORMANCE: Batch HTML rewriting
    client.element.on('setInnerHTML', event => {
        switch(event.that.tagName) {
            case 'SCRIPT':
                event.data.value = __uv.rewriteJS(event.data.value);
                break;
            case 'STYLE':
                event.data.value = cachedRewriteCSS(event.data.value, {
                    context: 'declarationList',
                    ...__uv.meta
                });
                break;
            default:
                event.data.value = __uv.rewriteHtml(event.data.value, {...__uv.meta});
        }
    });

    client.element.on('getInnerHTML', event => {
        switch(event.that.tagName) {
            case 'SCRIPT':
                event.data.value = __uv.sourceJS(event.data.value);
                break;
            case 'STYLE':
                event.data.value = __uv.sourceCSS(event.data.value, {
                    context: 'declarationList',
                    ...__uv.meta
                });
                break;
            default:
                event.data.value = __uv.sourceHtml(event.data.value, __uv.meta);
        }
    });

    client.element.on('setOuterHTML', event => {
        event.data.value = __uv.rewriteHtml(event.data.value, {...__uv.meta});
    });

    client.element.on('getOuterHTML', event => {
        event.data.value = __uv.sourceHtml(event.data.value, __uv.meta);
    });

    // Document
    client.document.on('getDomain', event => {
        event.data.value = __uv.domain;
    });

    client.document.on('setDomain', event => {
        if (!event.data.value.toString().endsWith(__uv.meta.url.hostname.split('.').slice(-2).join('.'))) return event.respondWith('');
        event.respondWith(__uv.domain = event.data.value);
    });

    client.document.on('url', event => {
        event.data.value = __uv.location.href;
    });

    client.document.on('documentURI', event => {
        event.data.value = __uv.location.href;
    });

    client.document.on('referrer', event => {
        event.data.value = __uv.referrer || __uv.sourceUrl(event.data.value);
    });

    client.document.on('parseFromString', event => {
        if (event.data.type !== 'text/html') return false;
        event.data.string = __uv.rewriteHtml(event.data.string, {...__uv.meta});
    });

    // PERFORMANCE: Optimized style handling
    const getStyleValue = (raw, prop, ctx) => {
        if (__uv.meta.url.protocol === 'https:' && prop === 'list-style' && /url\("?http:/.test(raw)) {
            return raw.replace(/url\("?http:/, 'url("https:');
        }
        return raw;
    };

    client.style.on('setProperty', event => {
        if (client.style.dashedUrlProps.includes(event.data.property) || event.data.property.startsWith('--') && event.data.value.includes('url(')) {
            event.data.value = cachedRewriteCSS(event.data.value, {
                context: 'value',
                ...__uv.meta,
            });
        }
    });

    client.style.on('getProperty', event => {
        if (client.style.dashedUrlProps.includes(event.data.property)) {
            event.data.value = __uv.sourceCSS(event.data.value, {
                context: 'value',
                ...__uv.meta,
            });
        }
    });

    // PERFORMANCE: Property descriptor optimizations
    if (HTMLMediaElement) {
        for (const name of ['src', 'currentSrc']) {
            client.overrideDescriptor(HTMLMediaElement.prototype, name, {
                get: (target, that) => {
                    return cachedSourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLMediaElement.prototype, name).get.call(that));
                },
                set: !name.includes('current') ? (target, that, val) => {
                    client.nativeMethods.getOwnPropertyDescriptor(HTMLMediaElement.prototype, name).set.call(that, cachedRewriteUrl(val));
                } : undefined,
            });
        }
    }

    if (HTMLScriptElement) {
        client.overrideDescriptor(HTMLScriptElement.prototype, 'src', {
            get: (target, that) => {
                return cachedSourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').set.call(that, cachedRewriteUrl(val));
            },
        });

        client.overrideDescriptor(HTMLScriptElement.prototype, 'integrity', {
            get: (target, that) => {
                return '';
            },
            set: (target, that, val) => {},
        });
    }

    // PERFORMANCE: Fast element property overrides
    const quickOverride = (proto, prop) => {
        if (!proto) return;
        const desc = client.nativeMethods.getOwnPropertyDescriptor(proto, prop);
        if (!desc || !desc.get) return;
        
        client.overrideDescriptor(proto, prop, {
            get: (target, that) => {
                return cachedSourceUrl(desc.get.call(that));
            },
            set: desc.set ? (target, that, val) => {
                desc.set.call(that, cachedRewriteUrl(val));
            } : undefined,
        });
    };

    // Batch override common elements
    quickOverride(HTMLAnchorElement?.prototype, 'href');
    quickOverride(HTMLImageElement?.prototype, 'src');
    quickOverride(HTMLImageElement?.prototype, 'srcset');
    quickOverride(HTMLIFrameElement?.prototype, 'src');
    quickOverride(HTMLEmbedElement?.prototype, 'src');
    quickOverride(HTMLVideoElement?.prototype, 'poster');
    quickOverride(HTMLAudioElement?.prototype, 'src');
    quickOverride(HTMLSourceElement?.prototype, 'src');
    quickOverride(HTMLTrackElement?.prototype, 'src');
    quickOverride(HTMLLinkElement?.prototype, 'href');
    quickOverride(HTMLAreaElement?.prototype, 'href');
    quickOverride(HTMLBaseElement?.prototype, 'href');
    quickOverride(HTMLFormElement?.prototype, 'action');
    quickOverride(HTMLInputElement?.prototype, 'formAction');

    if (HTMLInputElement) {
        client.overrideDescriptor(HTMLInputElement.prototype, 'value', {
            get: (target, that) => {
                const value = client.nativeMethods.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').get.call(that);
                if (that.type === 'url') {
                    return cachedSourceUrl(value);
                }
                return value;
            },
            set: (target, that, val) => {
                if (that.type === 'url') {
                    client.nativeMethods.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(that, cachedRewriteUrl(val));
                } else {
                    client.nativeMethods.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(that, val);
                }
            }
        });
    }

    if (HTMLIFrameElement) {
        client.overrideDescriptor(HTMLIFrameElement.prototype, 'contentWindow', {
            get: (target, that) => {
                const win = client.nativeMethods.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow').get.call(that);
                try {
                    if (!win.__uv) __uvHook(win, config, bare);
                } catch(e) {}
                return win;
            },
        });

        client.overrideDescriptor(HTMLIFrameElement.prototype, 'contentDocument', {
            get: (target, that) => {
                const doc = client.nativeMethods.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument').get.call(that);
                try {
                    if (doc && !doc.defaultView.__uv) __uvHook(doc.defaultView, config, bare);
                } catch(e) {}
                return doc;
            },
        });

        client.overrideDescriptor(HTMLIFrameElement.prototype, 'srcdoc', {
            get: (target, that) => {
                const value = client.nativeMethods.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'srcdoc').get.call(that);
                return __uv.sourceHtml(value, __uv.meta);
            },
            set: (target, that, val) => {
                const rewritten = __uv.rewriteHtml(val, {...__uv.meta});
                return client.nativeMethods.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'srcdoc').set.call(that, rewritten);
            }
        });
    }

    client.style.on('setCssText', event => {
        event.data.value = cachedRewriteCSS(event.data.value, {
            context: 'declarationList',
            ...__uv.meta
        });
    });

    client.style.on('getCssText', event => {
        event.data.value = __uv.sourceCSS(event.data.value, {
            context: 'declarationList',
            ...__uv.meta
        });
    });

    // Hash emulation
    if (!!window.window) {
        __uv.addEventListener.call(window, 'hashchange', event => {
            if (event.__uv$dispatched) return false;
            event.stopImmediatePropagation();
            const hash = window.location.hash;
            client.history.replaceState.call(window.history, '', '', event.oldURL);
            __uv.location.hash = hash;
        });
    }

    client.location.on('hashchange', (oldUrl, newUrl, ctx) => {
        if (ctx.HashChangeEvent && client.history.replaceState) {
            client.history.replaceState.call(window.history, '', '', cachedRewriteUrl(newUrl));

            const event = new ctx.HashChangeEvent('hashchange', { newURL: newUrl, oldURL: oldUrl });

            client.nativeMethods.defineProperty(event, methodPrefix + 'dispatched', {
                value: true,
                enumerable: false,
            }); 

            __uv.dispatchEvent.call(window, event);
        }
    });

    // Hooking functions & descriptors
    client.fetch.overrideRequest();
    client.fetch.overrideUrl();
    client.xhr.overrideOpen();
    client.xhr.overrideResponseUrl();
    client.element.overrideHtml();
    client.element.overrideAttribute();
    client.element.overrideInsertAdjacentHTML();
    client.element.overrideAudio();
    client.node.overrideBaseURI();
    client.node.overrideTextContent();
    client.attribute.overrideNameValue();
    client.document.overrideDomain();
    client.document.overrideURL();
    client.document.overrideDocumentURI();
    client.document.overrideWrite();
    client.document.overrideReferrer();
    client.document.overrideParseFromString();
    client.storage.overrideMethods();
    client.storage.overrideLength();
    client.object.overrideGetPropertyNames();
    client.object.overrideGetOwnPropertyDescriptors();
    client.history.overridePushState();
    client.history.overrideReplaceState();
    client.eventSource.overrideConstruct();
    client.eventSource.overrideUrl();
    client.websocket.overrideWebSocket();
    client.websocket.overrideProtocol();
    client.websocket.overrideUrl();
    client.url.overrideObjectURL();
    client.document.overrideCookie();
    client.message.overridePostMessage();
    client.message.overrideMessageOrigin();
    client.message.overrideMessageData();
    client.workers.overrideWorker();
    client.workers.overrideAddModule();
    client.workers.overrideImportScripts();
    client.workers.overridePostMessage();
    client.style.overrideSetGetProperty();
    client.style.overrideCssText();
    client.navigator.overrideSendBeacon();
    client.function.overrideFunction();
    client.function.overrideToString();
    client.location.overrideWorkerLocation(
        (href) => {
            return new URL(cachedSourceUrl(href));
        }
    );

    client.overrideDescriptor(window, 'localStorage', {
        get: (target, that) => {
            return (that || window).__uv.lsWrap;
        },
    });
    
    client.overrideDescriptor(window, 'sessionStorage', {
        get: (target, that) => {
            return (that || window).__uv.ssWrap;
        },
    });

    client.override(window, 'open', (target, that, args) => {
        if (!args.length) return target.apply(that, args);
        let [url] = args;

        url = cachedRewriteUrl(url);

        return target.call(that, url);
    });

    __uv.$wrap = function(name) {
        if (name === 'location') return __uv.methods.location;
        if (name === 'eval') return __uv.methods.eval;
        return name;
    };

    __uv.$get = function(that) {
        if (that === window.location) return __uv.location;
        if (that === window.eval) return __uv.eval;
        if (that === window.parent) {
            return window.__uv$parent;
        }
        if (that === window.top) {
            return window.__uv$top;
        }
        return that;
    };

    __uv.eval = client.wrap(window, 'eval', (target, that, args) => {
        if (!args.length || typeof args[0] !== 'string') return target.apply(that, args);
        let [script] = args;

        script = cachedRewriteJS(script);
        return target.call(that, script);
    });

    __uv.call = function(target, args, that) {
        return that ? target.apply(that, args) : target(...args);
    };

    __uv.call$ = function(obj, prop, args = []) {
        return obj[prop].apply(obj, args);
    };

    client.nativeMethods.defineProperty(window.Object.prototype, master, {
        get: () => {
            return __uv;
        },
        enumerable: false
    });

    client.nativeMethods.defineProperty(window.Object.prototype, __uv.methods.setSource, {
        value: function(source) {
            if (!client.nativeMethods.isExtensible(this)) return this;

            client.nativeMethods.defineProperty(this, __uv.methods.source, {
                value: source,
                writable: true,
                enumerable: false
            });

            return this;
        },
        enumerable: false,
    });

    client.nativeMethods.defineProperty(window.Object.prototype, __uv.methods.source, {
        value: __uv,
        writable: true,
        enumerable: false
    });

    client.nativeMethods.defineProperty(window.Object.prototype, __uv.methods.location, {
        configurable: true,
        get() {
            return (this === window.document || this === window) ? __uv.location : this.location;
        },
        set(val) {
            if (this === window.document || this === window) {
                __uv.location.href = val;
            } else {
                this.location = val;
            }
        },
    });

    client.nativeMethods.defineProperty(window.Object.prototype, __uv.methods.parent, {
        configurable: true,
        get() {
            const val = this.parent;

            if (this === window) {
                try {
                    return '__uv' in val ? val : this;
                } catch (e) {
                    return this;
                }
            }
            return val;
        },
        set(val) {
            this.parent = val;
        },
    });

    client.nativeMethods.defineProperty(window.Object.prototype, __uv.methods.top, {
        configurable: true,
        get() {
            const val = this.top;

            if (this === window) {
                if (val === this.parent) return this[__uv.methods.parent];
                try {
                    if (!('__uv' in val)) {
                        let current = this;

                        while (current.parent !== val) {
                            current = current.parent
                        }

                        return '__uv' in current ? current : this;

                    } else {
                        return val;
                    }
                } catch (e) {
                    return this;
                }
            }
            return val;
        },
        set(val) {
            this.top = val;
        },
    });

    client.nativeMethods.defineProperty(window.Object.prototype, __uv.methods.eval, {
        configurable: true,
        get() {
            return this === window ? __uv.eval : this.eval;
        },
        set(val) {
            this.eval = val;
        },
    });
}
