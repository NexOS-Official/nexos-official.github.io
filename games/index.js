const searchInput = document.querySelector('.search-bar');
const gameCards = document.querySelectorAll('.game-card');
const noResultsMessage = document.getElementById('noResultsMessage');

function filterGames(query) {
  const lowerQuery = query.toLowerCase();
  let resultsFound = false;

  gameCards.forEach(card => {
    const text = card.textContent.toLowerCase();
    if (text.includes(lowerQuery)) {
      card.style.display = '';
      resultsFound = true;
    } else {
      card.style.display = 'none';
    }
  });

  noResultsMessage.style.display = resultsFound ? 'none' : 'flex';
}

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim();

  if (query) {
    window.history.replaceState(null, '', `#search=${encodeURIComponent(query)}`);
  } else {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  filterGames(query);
});

window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const searchTerm = params.get('search') || '';

  const decodedTerm = decodeURIComponent(searchTerm);
  searchInput.value = decodedTerm;
  filterGames(decodedTerm);
});

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const searchTerm = params.get('search') || '';

  const decodedTerm = decodeURIComponent(searchTerm);
  searchInput.value = decodedTerm;
  filterGames(decodedTerm);
});


document.addEventListener('DOMContentLoaded', function() {
  const cursorFollow = document.createElement('div');
  cursorFollow.classList.add('cursor-follow');
  document.body.appendChild(cursorFollow);

  let mouseX = 0;
  let mouseY = 0;
  let cursorX = 0;
  let cursorY = 0;

  document.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animateCursor() {
    const speed = 0.15;
    cursorX += (mouseX - cursorX) * speed;
    cursorY += (mouseY - cursorY) * speed;

    cursorFollow.style.left = cursorX + 'px';
    cursorFollow.style.top = cursorY + 'px';

    requestAnimationFrame(animateCursor);
  }

  animateCursor();

    card.addEventListener('mouseleave', function() {
      document.body.classList.remove('game-hover');
      cursorFollow.style.opacity = '0';
      cursorFollow.style.width = '300px';
      cursorFollow.style.height = '300px';
    });

    card.addEventListener('click', () => {
      const url = card.getAttribute('data-url');
      if (url) {
        window.location.href = url;
      }
    });
  });

  searchInput.addEventListener('input', function() {
    const query = this.value.toLowerCase();
    let resultsFound = false;

    gameCards.forEach(card => {
      const title = card.querySelector('h3').textContent.toLowerCase();
      if (title.includes(query)) {
        card.style.display = '';
        resultsFound = true;
      } else {
        card.style.display = 'none';
      }
    });

    if (!resultsFound && query !== '') {
      noResultsMessage.style.display = 'flex';
    } else {
      noResultsMessage.style.display = 'none';
    }
  });
