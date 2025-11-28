const MAX_REFRESHES = 10;
const WINDOW_MS = 5000;
let reloads = JSON.parse(localStorage.getItem("relog") || "[]");
const now = Date.now();
reloads = reloads.filter(t => now - t <= WINDOW_MS);
reloads.push(now);
localStorage.setItem("relog", JSON.stringify(reloads));
if (reloads.length > MAX_REFRESHES) {
    document.body.style.overflow = "hidden";
    document.getElementById("oops-you-did-it-again").style.display = "flex";
    document.getElementById("bigggbrocont").style.display = "none";
}
function openPage(url) {
    window.location.href = url;
}
const cards = document.querySelectorAll('.foldarcad');
cards.forEach(card => {
    const img = card.querySelector('img');
    card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const px = x / rect.width * 100;
        const py = y / rect.height * 100;
        img.style.transformOrigin = `${px}% ${py}%`;
        img.style.transform = 'scale(1.2)';
    });
    card.addEventListener('mouseleave', () => {
        img.style.transformOrigin = 'center center';
        img.style.transform = 'scale(1)';
    });
});

const bigHeader = document.querySelector('.biggggggggggggggggggtopgame');
const bigImg = bigHeader.querySelector('img');
bigHeader.addEventListener('mousemove', e => {
    const rect = bigHeader.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width * 100;
    const py = y / rect.height * 100;
    bigImg.style.transformOrigin = `${px}% ${py}%`;
    bigImg.style.transform = 'scale(1.05)';
});
bigHeader.addEventListener('mouseleave', () => {
    bigImg.style.transformOrigin = 'center center';
    bigImg.style.transform = 'scale(1)';
});
