export function createServerList(servers, activeServerIndex) {
    if (!servers || servers.length === 0) {
        return '<div class="text-[10px] font-mono text-white/20 text-center py-10">NO_SERVERS_AVAILABLE</div>';
    }

    return servers.map((server, index) => `
        <button
            class="server-btn w-full p-3 text-left flex items-center justify-between ${activeServerIndex === index ? 'active' : 'text-white/40'}"
            data-index="${index}"
        >
            <span>${server.name}</span>
            <span class="text-[8px] opacity-50">NODE_${(index + 1).toString().padStart(2, '0')}</span>
        </button>
    `).join('');
}
