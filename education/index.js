"use strict";

const form = document.getElementById("uv-form");
const address = document.getElementById("uv-address");
const searchEngine = document.getElementById("uv-search-engine");
const error = document.getElementById("uv-error");
const errorCode = document.getElementById("uv-error-code");

const isValidUrl = (url) => {
  try {
    return !!new URL(url);
  } catch {
    return false;
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.textContent = "";
  errorCode.textContent = "";

  const input = address.value.trim();
  if (!input) {
    error.textContent = "Please enter a URL or search term.";
    return;
  }

  const url = searchEngine.value ? search(input, searchEngine.value) : input;

  try {
    await registerSW();
    location.href = __uv$config.prefix + __uv$config.encodeUrl(url);
  } catch (err) {
    error.textContent = "Failed to register service worker.";
    errorCode.textContent = err;
  }
});

const autofill = (url) => {
  if (!url) return;
  address.value = url;
  form.requestSubmit();
};
