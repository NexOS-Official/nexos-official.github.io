const svgthingssotheiconsfrombootstrapwork = document.querySelectorAll('.sidebahhhhhhhforthegameiconstuffsotheycanfindgenresofgames i');
const thesearecardstoholdgames = document.querySelectorAll('.foldarcads');

svgthingssotheiconsfrombootstrapwork.forEach(svgthing => {
    svgthing.addEventListener('click', () => {
        svgthingssotheiconsfrombootstrapwork.forEach(sv => sv.classList.remove('active'));
        svgthing.classList.add('active');

        const filterTag = svgthing.getAttribute('title').toLowerCase().trim();

        thesearecardstoholdgames.forEach(thesearecard => {
            const tags = thesearecard.getAttribute('data-tags').toLowerCase();
            thesearecard.style.display = (tags.includes(filterTag) || filterTag === 'all') ? 'block' : 'none';
        });
    });
});

thesearecardstoholdgames.forEach(thesearecard => {
    thesearecard.addEventListener('click', () => {
        const url = thesearecard.getAttribute('data-url');
        if (url) {
            window.location.href = url;
        }
    });
});

thesearecardstoholdgames.forEach(thesearecard => {
    const img = thesearecard.querySelector('img');
    thesearecard.addEventListener('mousemove', e => {
        const rect = thesearecard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const px = (x / rect.width) * 100;
        const py = (y / rect.height) * 100;
        img.style.transformOrigin = `${px}% ${py}%`;
        img.style.transform = 'scale(1.2)';
    });
    thesearecard.addEventListener('mouseleave', () => {
        img.style.transformOrigin = 'center center';
        img.style.transform = 'scale(1)';
    });
});
