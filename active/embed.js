"use strict";

let urlParams = new URLSearchParams(window.location.search);

let destination = urlParams.get("url");

if (!destination) {
  alert("Error: No URL provided!");
  throw new Error("No URL provided");
}

try {
  destination = new URL(destination).toString();
} catch (err) {
  alert(`Your boat crashed!\nInvalid URL:\n${err}`);
  throw err;
}

// Intercept window.open so new tabs stay in the proxy
const originalWindowOpen = window.open;
window.open = function(url, target, features) {
  if (url && url !== 'about:blank' && window.parent !== window) {
    try {
      const resolved = new URL(url, destination).toString();
      window.parent.postMessage({ type: 'openNewTab', url: resolved }, '*');
      return null;
    } catch(e) {}
  }
  if (url && url !== 'about:blank' && target !== '_self') {
    try {
      const resolved = new URL(url, destination).toString();
      window.parent.postMessage({ type: 'openNewTab', url: resolved }, '*');
      return null;
    } catch(e) {}
  }
  return originalWindowOpen.call(this, url, target, features);
};

// Intercept target="_blank" link clicks
document.addEventListener('click', function(e) {
  const link = e.target.closest('a[target="_blank"]');
  if (link && link.href) {
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ type: 'openNewTab', url: link.href }, '*');
  }
}, true);

registerSW()
  .then(() => {
    window.open(__uv$config.prefix + __uv$config.encodeUrl(destination), "_self");
  })
  .catch((err) => {
    alert(`Your boat crashed!\nAn error occurred:\n${err}`);
  });
