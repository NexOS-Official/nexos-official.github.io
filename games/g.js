
const COVER_URL = "https://cdn.jsdelivr.net/gh/gn-math/covers@main";
const HTML_URL = "https://cdn.jsdelivr.net/gh/gn-math/html@main";
const POP_URL = "https://data.jsdelivr.net/v1/stats/packages/gh/gn-math/html@main/files?period=year";

const gameGrid = document.getElementById("games");
const searchInput = document.getElementById("search");
const gameContainer = document.getElementById("gameContainer");
const gameContent = document.getElementById("gameContent");
const gameTitleEl = document.getElementById("game-title");

let allGames = [];
let popularityMap = {};

// 1. Fetch Popularity Stats
fetch(POP_URL)
  .then((r) => r.json())
  .then((data) => {
    data.forEach((file) => {
      const id = parseInt(file.name.replace("/", "").replace(".html", ""));
      popularityMap[id] = file.hits?.total || 0;
    });
  })
  .catch(() => console.warn("Could not load popularity stats."));

// 2. Fetch Games Database
fetch("../json/zones.json")
  .then((r) => r.json())
  .then((data) => {
    allGames = data.map((g) => ({
      ...g,
      cover: g.cover.replace("{COVER_URL}", COVER_URL),
      url: g.url.replace("{HTML_URL}", HTML_URL),
      popularity: popularityMap[g.id] || 0,
    }));

    // Sort by popularity by default
    allGames.sort((a, b) => b.popularity - a.popularity);

    render(allGames);
  })
  .catch((err) => {
    gameGrid.textContent = "Failed to load drive files: " + err;
  });

// 3. Render Grid (Drive Style)
function render(games) {
  gameGrid.innerHTML = "";
  
  if (games.length === 0) {
    gameGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 100px; text-align: center; opacity: 0.3;">
        <i class="fas fa-folder-open" style="font-size: 4rem; margin-bottom: 20px; display: block;"></i>
        <p>No files found in this folder.</p>
    </div>`;
    return;
  }

  games.forEach((game) => {
    const card = document.createElement("div");
    card.className = "game-card";
    
    // Using the card-icon for the preview/cover
    card.innerHTML = `
      <div class="card-icon">
        <img data-src="${game.cover}" alt="${game.name}" loading="lazy" style="opacity: 0; transition: opacity 0.3s;">
        <i class="fas fa-file-lines fallback-icon" style="position: absolute; z-index: -1;"></i>
      </div>
      <div class="card-info">
        <i class="fas fa-file-code"></i>
        <span>${game.name}.dat</span>
      </div>
    `;

    card.onclick = () => openGame(game);
    gameGrid.appendChild(card);
  });

  lazyLoadImages();
}

// 4. Lazy Loading Logic
function lazyLoadImages() {
  const images = gameGrid.querySelectorAll("img[data-src]");
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        img.src = img.dataset.src;
        img.onload = () => {
          img.style.opacity = "1";
          const fallback = img.parentElement.querySelector('.fallback-icon');
          if (fallback) fallback.style.display = 'none';
        };
        img.removeAttribute("data-src");
        obs.unobserve(img);
      });
    },
    { rootMargin: "100px" }
  );
  images.forEach((img) => observer.observe(img));
}

// 5. Search Logic
searchInput.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = allGames.filter((g) => g.name && g.name.toLowerCase().includes(query));
  render(filtered);
});

// 6. Proxy Game Loading (HTML Injection)
async function openGame(game) {
  gameTitleEl.textContent = `${game.name}.dat`;
  gameContainer.style.display = "flex";
  document.body.style.overflow = "hidden";

  gameContent.innerHTML = "";

  const iframe = document.createElement("iframe");
  iframe.src = "about:blank";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.allowFullscreen = true;
  iframe.setAttribute("sandbox", "allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation allow-top-navigation-by-user-activation");

  gameContent.appendChild(iframe);

  try {
    // We add a timestamp to prevent caching issues
    let html = await fetch(game.url + "?t=" + Date.now()).then((r) => r.text());

    // Fix relative paths by injecting a <base> tag
    const base = game.url.substring(0, game.url.lastIndexOf("/") + 1);
    if (!html.match(/<base\s/i)) {
      html = html.replace("<head>", `<head><base href="${base}">`);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Re-trigger scripts if necessary (some browsers need this for injected HTML)
    doc.querySelectorAll("script").forEach((oldScript) => {
      const newScript = doc.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });

    document.title = `${game.name} - Drive View`;
  } catch (err) {
    gameContent.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; flex-direction:column; gap:20px; opacity:0.5;">
        <i class="fas fa-triangle-exclamation" style="font-size:3rem;"></i>
        <p>Failed to load drive content: ${err.message}</p>
    </div>`;
  }
}


function closeGame() {
  gameContainer.style.display = "none";
  document.body.style.overflow = "";
  gameContent.innerHTML = "";
  document.title = "My Drive - Google Drive";
}

function toggleFullscreen() {
  const el = gameContent;
  if (!document.fullscreenElement) {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}


window.closeGame = closeGame;
window.toggleFullscreen = toggleFullscreen;
