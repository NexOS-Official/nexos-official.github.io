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

    // LIGHTWEIGHT: Small caches for Chromebook
    const urlCache = new Map();
    const MAX_CACHE = 100; // Small cache size

    // Simple cache helper
    const cached = (cache, key, fn) => {
        if (cache.has(key)) return cache.get(key);
        const result = fn();
        if (cache.size >= MAX_CACHE) cache.clear(); // Simple clear
        cache.set(key, result);
        return result;
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
            return new URL(__uv.sourceUrl(href));
        },
        (href) => {
            return __uv.rewriteUrl(href);
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

    client.nativeMethods.defineProperty(client.storage.storeProto, '__uv$storageObj', {
        get() {
            if (this === client.storage.sessionStorage) return __uv.sessionStorageObj;
            if (this === client.storage.localStorage) return __uv.localStorageObj;
        },
        enumerable: false,
    });

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
    let base = __uv.sourceUrl(rawBase);

    client.nativeMethods.defineProperty(__uv.meta, 'base', {
        get() {
            if (!window.document) return __uv.meta.url.href;

            const currentBase = client.node.baseURI.get.call(window.document);
            if (currentBase !== rawBase) {
                rawBase = currentBase;
                base = __uv.sourceUrl(rawBase);
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

    // Lightweight URL caching for most common operations
    const rewriteUrl = (url) => {
        if (typeof url !== 'string' || url.length > 200) return __uv.rewriteUrl(url);
        return cached(urlCache, 'r:' + url, () => __uv.rewriteUrl(url));
    };

    const sourceUrl = (url) => {
        if (typeof url !== 'string' || url.length > 200) return __uv.sourceUrl(url);
        return cached(urlCache, 's:' + url, () => __uv.sourceUrl(url));
    };

    client.fetch.on('request', event => {
        event.data.input = rewriteUrl(event.data.input);
    });

    client.fetch.on('requestUrl', event => {
        event.data.value = sourceUrl(event.data.value);
    });

    client.fetch.on('responseUrl', event => {
        event.data.value = sourceUrl(event.data.value);
    });

    client.xhr.on('open', event => {
        event.data.input = rewriteUrl(event.data.input);
    });

    client.xhr.on('responseUrl', event => {
        event.data.value = sourceUrl(event.data.value);
    });

    client.workers.on('worker', event => {
        event.data.url = rewriteUrl(event.data.url);
    });

    client.workers.on('addModule', event => {
        event.data.url = rewriteUrl(event.data.url);
    });

    client.workers.on('importScripts', event => {
        for (const i in event.data.scripts) {
            event.data.scripts[i] = rewriteUrl(event.data.scripts[i]);
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

    client.navigator.on('sendBeacon', event => {
        event.data.url = rewriteUrl(event.data.url);
    });

    client.document.on('getCookie', event => {
        event.data.value = __uv.cookieStr;
    });

    client.document.on('setCookie', event => {
        Promise.resolve(__uv.cookie.setCookies(event.data.value, __uv.db, __uv.meta)).then(() => {
            __uv.cookie.db().then(db => {
                __uv.cookie.getCookies(db).then(cookies => {
                    __uv.cookieStr = __uv.cookie.serialize(cookies, __uv.meta, true);
                });
            });
        });
        const cookie = __uv.cookie.setCookie(event.data.value)[0];

        if (!cookie.path) cookie.path = '/';
        if (!cookie.domain) cookie.domain = __uv.meta.url.hostname;

        if (__uv.cookie.validateCookie(cookie, __uv.meta, true)) {
            if (__uv.cookieStr.length) __uv.cookieStr += '; ';
            __uv.cookieStr += `${cookie.name}=${cookie.value}`;
        }

        event.respondWith(event.data.value);
    });

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

    client.node.on('getTextContent', event => {
        if (event.that instanceof HTMLScriptElement) {
            event.data.value = __uv.sourceJS(event.data.value);
        }
    });

    client.node.on('setTextContent', event => {
        if (event.that instanceof HTMLScriptElement) {
            event.data.value = __uv.rewriteJS(event.data.value);
        }
    });

    client.attribute.on('getValue', event => {
        if (client.attribute.isUrl(event.data.name)) {
            event.data.value = sourceUrl(event.data.value);
        }

        if (client.attribute.isStyle(event.data.name)) {
            event.data.value = __uv.sourceCSS(event.data.value, {
                context: 'declarationList',
                ...__uv.meta
            });
        }

        if (client.attribute.isHtml(event.data.name)) {
            event.data.value = __uv.sourceHtml(event.data.value, __uv.meta);
        }

        if (client.attribute.isSrcset(event.data.name)) {
            event.data.value = __uv.sourceHtml(event.data.value, __uv.meta);
        }

        if (event.data.name === 'integrity') {
            event.data.value = '';
        }
    });

    client.attribute.on('setValue', event => {
        if (client.attribute.isUrl(event.data.name)) {
            event.data.value = rewriteUrl(event.data.value);
        }

        if (client.attribute.isStyle(event.data.name)) {
            event.data.value = __uv.rewriteCSS(event.data.value, {
                context: 'declarationList',
                ...__uv.meta
            });
        }

        if (client.attribute.isHtml(event.data.name)) {
            event.data.value = __uv.rewriteHtml(event.data.value, {...__uv.meta});
        }

        if (client.attribute.isSrcset(event.data.name)) {
            event.data.value = __uv.rewriteHtml(event.data.value, {...__uv.meta});
        }

        if (event.data.name === 'integrity') {
            event.data.value = '';
        }
    });

    client.element.on('setInnerHTML', event => {
        switch(event.that.tagName) {
            case 'SCRIPT':
                event.data.value = __uv.rewriteJS(event.data.value);
                break;
            case 'STYLE':
                event.data.value = __uv.rewriteCSS(event.data.value, {
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

    client.style.on('setProperty', event => {
        if (client.style.dashedUrlProps.includes(event.data.property) || event.data.property.startsWith('--') && event.data.value.includes('url(')) {
            event.data.value = __uv.rewriteCSS(event.data.value, {
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

    if (HTMLMediaElement) {
        for (const name of ['src', 'currentSrc']) {
            client.overrideDescriptor(HTMLMediaElement.prototype, name, {
                get: (target, that) => {
                    return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLMediaElement.prototype, name).get.call(that));
                },
                set: !name.includes('current') ? (target, that, val) => {
                    client.nativeMethods.getOwnPropertyDescriptor(HTMLMediaElement.prototype, name).set.call(that, rewriteUrl(val));
                } : undefined,
            });
        }
    }

    if (HTMLScriptElement) {
        client.overrideDescriptor(HTMLScriptElement.prototype, 'src', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').set.call(that, rewriteUrl(val));
            },
        });

        client.overrideDescriptor(HTMLScriptElement.prototype, 'integrity', {
            get: (target, that) => {
                return '';
            },
            set: (target, that, val) => {},
        });
    }

    if (HTMLAnchorElement) {
        client.overrideDescriptor(HTMLAnchorElement.prototype, 'href', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'href').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'href').set.call(that, rewriteUrl(val));
            },
        });
    }

    if (HTMLImageElement) {
        client.overrideDescriptor(HTMLImageElement.prototype, 'src', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set.call(that, rewriteUrl(val));
            },
        });

        client.overrideDescriptor(HTMLImageElement.prototype, 'srcset', {
            get: (target, that) => {
                return __uv.sourceHtml(client.nativeMethods.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'srcset').get.call(that), __uv.meta);
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'srcset').set.call(that, __uv.rewriteHtml(val, {...__uv.meta}));
            },
        });
    }

    if (HTMLFormElement) {
        client.overrideDescriptor(HTMLFormElement.prototype, 'action', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLFormElement.prototype, 'action').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLFormElement.prototype, 'action').set.call(that, rewriteUrl(val));
            },
        });
    }

    if (HTMLInputElement) {
        client.overrideDescriptor(HTMLInputElement.prototype, 'value', {
            get: (target, that) => {
                const value = client.nativeMethods.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').get.call(that);
                if (that.type === 'url') {
                    return sourceUrl(value);
                }
                return value;
            },
            set: (target, that, val) => {
                if (that.type === 'url') {
                    client.nativeMethods.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(that, rewriteUrl(val));
                } else {
                    client.nativeMethods.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(that, val);
                }
            }
        });

        client.overrideDescriptor(HTMLInputElement.prototype, 'formAction', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'formAction').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'formAction').set.call(that, rewriteUrl(val));
            },
        });
    }

    if (HTMLEmbedElement) {
        client.overrideDescriptor(HTMLEmbedElement.prototype, 'src', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLEmbedElement.prototype, 'src').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLEmbedElement.prototype, 'src').set.call(that, rewriteUrl(val));
            },
        });
    }

    if (HTMLIFrameElement) {
        client.overrideDescriptor(HTMLIFrameElement.prototype, 'src', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src').set.call(that, rewriteUrl(val));
            },
        });

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

    if (HTMLAreaElement) {
        client.overrideDescriptor(HTMLAreaElement.prototype, 'href', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLAreaElement.prototype, 'href').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLAreaElement.prototype, 'href').set.call(that, rewriteUrl(val));
            },
        });
    }

    if (HTMLLinkElement) {
        client.overrideDescriptor(HTMLLinkElement.prototype, 'href', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href').set.call(that, rewriteUrl(val));
            },
        });

        client.overrideDescriptor(HTMLLinkElement.prototype, 'integrity', {
            get: (target, that) => {
                return '';
            },
            set: (target, that, val) => {},
        });
    }

    if (HTMLBaseElement) {
        client.overrideDescriptor(HTMLBaseElement.prototype, 'href', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLBaseElement.prototype, 'href').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLBaseElement.prototype, 'href').set.call(that, rewriteUrl(val));
            },
        });
    }

    if (HTMLSourceElement) {
        client.overrideDescriptor(HTMLSourceElement.prototype, 'src', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLSourceElement.prototype, 'src').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLSourceElement.prototype, 'src').set.call(that, rewriteUrl(val));
            },
        });
    }

    if (HTMLVideoElement) {
        client.overrideDescriptor(HTMLVideoElement.prototype, 'poster', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'poster').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'poster').set.call(that, rewriteUrl(val));
            }
        });
    }

    if (HTMLTrackElement) {
        client.overrideDescriptor(HTMLTrackElement.prototype, 'src', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLTrackElement.prototype, 'src').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLTrackElement.prototype, 'src').set.call(that, rewriteUrl(val));
            },
        });
    }

    if (HTMLAudioElement) {
        client.overrideDescriptor(HTMLAudioElement.prototype, 'src', {
            get: (target, that) => {
                return sourceUrl(client.nativeMethods.getOwnPropertyDescriptor(HTMLAudioElement.prototype, 'src').get.call(that));
            },
            set: (target, that, val) => {
                client.nativeMethods.getOwnPropertyDescriptor(HTMLAudioElement.prototype, 'src').set.call(that, rewriteUrl(val));
            },
        });
    }

    client.style.on('setCssText', event => {
        event.data.value = __uv.rewriteCSS(event.data.value, {
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
            client.history.replaceState.call(window.history, '', '', rewriteUrl(newUrl));

            const event = new ctx.HashChangeEvent('hashchange', { newURL: newUrl, oldURL: oldUrl });

            client.nativeMethods.defineProperty(event, methodPrefix + 'dispatched', {
                value: true,
                enumerable: false,
            }); 

            __uv.dispatchEvent.call(window, event);
        }
    });

    // Hooking
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
            return new URL(__uv.sourceUrl(href));
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

        url = rewriteUrl(url);

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

        script = __uv.rewriteJS(script);
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
