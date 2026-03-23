export function createChannelCard(channel, isActive, isFavorite = false) {
    return `
        <div
            class="channel-row group flex items-center gap-6 p-4 cursor-pointer relative overflow-hidden ${isActive ? 'active' : ''}"
            data-id="${channel.id}"
        >
            <div class="w-16 h-10 bg-zinc-900 flex-shrink-0 border border-white/5 overflow-hidden relative">
                <img src="${channel.thumbnail}" alt="" class="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" referrerpolicy="no-referrer">
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-0.5">
                    <span class="font-mono text-[10px] text-[#ff4e00] tracking-tighter">${channel.code}</span>
                    <h4 class="font-bold uppercase text-sm truncate tracking-tight">${channel.name}</h4>
                </div>
                <p class="text-[10px] font-mono text-white/20 uppercase truncate tracking-wider">${channel.description}</p>
            </div>
            <div class="flex items-center gap-4">
                <button 
                    class="favorite-btn p-2 rounded-full transition-all ${isFavorite ? 'text-[#ff4e00]' : 'text-white/10 hover:text-white/40'}"
                    data-id="${channel.id}"
                    onclick="event.stopPropagation()"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </button>
                <div class="text-[10px] font-mono text-white/10 group-hover:text-[#ff4e00] transition-colors uppercase">
                    ${channel.category}
                </div>
            </div>
        </div>
    `;
}
