// Enhanced interactivity and animations

document.addEventListener('DOMContentLoaded', () => {
    // Game Cards Click Handler
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.closest('.play-button')) {
                const url = this.getAttribute('data-url');
                console.log(`[v0] Navigating to: ${url}`);
                // Add your navigation logic here
                // window.location.href = url;
            }
        });
    });

    // Play Buttons
    const playButtons = document.querySelectorAll('.play-button');
    
    playButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const gameCard = this.closest('.game-card');
            const url = gameCard.getAttribute('data-url');
            const gameName = gameCard.querySelector('h3').textContent;
            
            console.log(`[v0] Starting game: ${gameName}`);
            console.log(`[v0] Game URL: ${url}`);
            
            // Add ripple effect
            createRipple(e, this);
            
            // Add your game launch logic here
            // window.location.href = url;
        });
    });

    // Filter Chips
    const chips = document.querySelectorAll('.chip');
    
    chips.forEach(chip => {
        chip.addEventListener('click', function() {
            chips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.textContent;
            console.log(`[v0] Filtering games by: ${filter}`);
            
            // Add your filtering logic here
            filterGames(filter);
        });
    });

    // Search Input
    const searchInput = document.querySelector('.search-input');
    let searchTimeout;
    
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            const query = e.target.value;
            console.log(`[v0] Searching for: ${query}`);
            
            // Add your search logic here
            searchGames(query);
        }, 300);
    });

    // CTA Button
    const ctaButton = document.querySelector('.cta-button');
    
    ctaButton.addEventListener('click', function(e) {
        createRipple(e, this);
        console.log(`[v0] CTA button clicked`);
        
        // Smooth scroll to games
        document.querySelector('.games-container').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    });

    // FAB Button
    const fab = document.querySelector('.fab');
    
    fab.addEventListener('click', function() {
        console.log(`[v0] FAB clicked - Add your action here`);
        
        // Example: Scroll to top
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Parallax effect for hero
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroGlow = document.querySelector('.hero-glow');
        
        if (heroGlow) {
            heroGlow.style.transform = `translate(-50%, -50%) translateY(${scrolled * 0.5}px)`;
        }
    });

    // Mouse move effect for cards
    gameCards.forEach(card => {
        card.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            this.style.transform = `translateY(-8px) scale(1.02) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });

    // Add stagger animation to cards on load
    observeCards();
});

// Helper Functions

function createRipple(event, element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

function filterGames(filter) {
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach(card => {
        if (filter === 'All') {
            card.style.display = 'block';
        } else {
            // Add your filtering logic based on game categories
            // For now, just show all
            card.style.display = 'block';
        }
    });
}

function searchGames(query) {
    const gameCards = document.querySelectorAll('.game-card');
    const lowerQuery = query.toLowerCase();
    
    gameCards.forEach(card => {
        const gameName = card.querySelector('h3').textContent.toLowerCase();
        
        if (gameName.includes(lowerQuery)) {
            card.style.display = 'block';
            card.style.animation = 'fadeIn 0.3s ease-in-out';
        } else {
            card.style.display = 'none';
        }
    });
}

function observeCards() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 50);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    const cards = document.querySelectorAll('.game-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        observer.observe(card);
    });
}

// Add CSS for ripple effect dynamically
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: rippleEffect 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes rippleEffect {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
