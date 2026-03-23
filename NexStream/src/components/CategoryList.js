export function createCategoryList(categories, activeCategory, channels) {
    return categories.map(cat => `
        <button
            class="nav-btn w-full flex items-center justify-between px-4 py-3 text-xs font-mono uppercase tracking-widest transition-all ${activeCategory === cat ? 'active' : 'text-white/20 hover:text-white/60'}"
            data-category="${cat}"
        >
            <span>${cat}</span>
            <span class="text-[10px] opacity-30">${channels.filter(c => cat === 'ALL' || c.category.toUpperCase() === cat).length}</span>
        </button>
    `).join('');
}
