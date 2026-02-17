"use strict";

function search(input, template) {
  input = input.trim();

  if (!input) {
    return template.replace("%s", "");
  }

  try {
    const url = new URL(input);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {}

  try {
    const url = new URL("http://" + input);
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname)) {
      return url.toString();
    }
  } catch {}

  return template.replace("%s", encodeURIComponent(input));
}
