export function createQualityMenu(levels, currentLevel) {
    if (!levels || levels.length === 0) {
        return '<div class="px-4 py-2 text-[10px] font-mono text-white/20">NO_QUALITY_OPTS</div>';
    }

    const items = [
        { name: 'AUTO', index: -1 },
        ...levels.map((level, index) => ({
            name: `${level.height}P`,
            index: index
        })).reverse()
    ];

    return items.map(item => `
        <button
            class="quality-item ${currentLevel === item.index ? 'active' : ''}"
            data-index="${item.index}"
        >
            ${item.name}
        </button>
    `).join('');
}
