const svgthingssotheiconsfrombootstrapwork =
document.querySelectorAll('.sidebahhhhhhhforthegameiconstuffsotheycanfindgenresofgames i');

const thesearecardstoholdgames =
document.querySelectorAll('.foldarcads');
svgthingssotheiconsfrombootstrapwork.forEach(svgthing => {
    svgthing.addEventListener('click', () => {
        svgthingssotheiconsfrombootstrapwork.forEach(sv => sv.classList.remove('active'));
        svgthing.classList.add('active');

        const filterTag = svgthing.getAttribute('title').toLowerCase().trim();

        thesearecardstoholdgames.forEach(card => {
            const tags = card.getAttribute('data-tags').toLowerCase();
            card.style.display =
            (tags.includes(filterTag) || filterTag === 'all') ? 'block' : 'none';
        });
    });
});
thesearecardstoholdgames.forEach(card => {
    card.addEventListener('click', () => {
        const url = card.getAttribute('data-url');
        if (url) window.location.href = url;
    });
});
thesearecardstoholdgames.forEach(card => {
    const img = card.querySelector('img');
    card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        img.style.transformOrigin =
        `${(e.clientX - rect.left) / rect.width * 100}% ${(e.clientY - rect.top) / rect.height * 100}%`;
        img.style.transform = 'scale(1.2)';
    });
    card.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
    });
});
const searchInput = document.getElementById('searchforthejstofindwithtitle');
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    thesearecardstoholdgames.forEach(card => {
        const title = card.querySelector('img').getAttribute('title').toLowerCase();
        card.style.display = title.includes(query) ? 'block' : 'none';
    });
});
