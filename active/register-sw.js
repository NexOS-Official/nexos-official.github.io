"use strict";

const stockSW = "/active/uv-sw.js";
const swAllowedHostnames = ["localhost", "127.0.0.1"];

async function registerSW(customSW) {
  if (location.protocol !== "https:" && !swAllowedHostnames.includes(location.hostname)) {
    throw new Error(`Service workers require HTTPS. Current: ${location.protocol}//${location.hostname}`);
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Your browser does not support service workers.");
  }

  const swPath = customSW || stockSW;

  try {
    await navigator.serviceWorker.register(swPath, { scope: __uv$config.prefix });
  } catch (err) {
    throw new Error(`Failed to register service worker: ${err}`);
  }
}
