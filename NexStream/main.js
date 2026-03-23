import { DEFAULT_VOLUME, CLOCK_UPDATE_INTERVAL } from './data/constants.js';
import { getRandomLatency } from './utils/helpers.js';
import { initHlsPlayer } from './utils/player.js';
import { createChannelCard } from './components/ChannelCard.js';
import { createQualityMenu } from './components/QualitySelector.js';
import { createServerList } from './components/ServerList.js';
import { saveToStorage, loadFromStorage } from './utils/storage.js';

let channels = [];
let activeCategory = 'ALL';
let searchQuery = '';
let selectedChannel = null;
let activeServerIndex = 0;
let isMuted = false;
let hlsInstance = null;
let favorites = loadFromStorage('nexstream_favorites', []);

const videoPlayer = document.getElementById('video-player');
const channelGrid = document.getElementById('channel-grid');
const categoriesNav = document.getElementById('categories');
const searchInput = document.getElementById('search-input');
const serverList = document.getElementById('server-list');
const muteBtn = document.getElementById('mute-btn');
const volumeSlider = document.getElementById('volume-slider');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const playerLoading = document.getElementById('player-loading');
const currentTimeEl = document.getElementById('current-time');
const qualityMenu = document.getElementById('quality-menu');
const currentQualityEl = document.getElementById('current-quality');

async function init() {
    await fetchChannels();
    renderCategories();
    renderChannels();
    updateClock();
    setInterval(updateClock, CLOCK_UPDATE_INTERVAL);
    setupEventListeners();
    
    const savedVolume = loadFromStorage('nexstream_volume', DEFAULT_VOLUME);
    videoPlayer.volume = savedVolume;
    volumeSlider.value = savedVolume;
    isMuted = savedVolume === 0;
    updateVolumeIcon();

    const lastChannelId = loadFromStorage('nexstream_last_channel');
    const lastChannel = channels.find(c => c.id === lastChannelId) || channels[0];
    if (lastChannel) {
        selectChannel(lastChannel);
    }
}

async function fetchChannels() {
    try {
        const response = await fetch('/api/channels');
        channels = await response.json();
    } catch (error) {
        console.error('Failed to fetch channels:', error);
    }
}

function setupEventListeners() {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderChannels();
    });

    volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        videoPlayer.volume = val;
        isMuted = val === 0;
        saveToStorage('nexstream_volume', val);
        updateVolumeIcon();
    });

    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        videoPlayer.muted = isMuted;
        if (!isMuted && videoPlayer.volume === 0) {
            videoPlayer.volume = 0.5;
            volumeSlider.value = 0.5;
            saveToStorage('nexstream_volume', 0.5);
        }
        updateVolumeIcon();
    });

    fullscreenBtn.addEventListener('click', () => {
        const container = document.getElementById('player-container');
        if (!document.fullscreenElement) {
            if (container.requestFullscreen) container.requestFullscreen();
            else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });

    videoPlayer.addEventListener('waiting', () => {
        playerLoading.style.opacity = '1';
    });

    videoPlayer.addEventListener('playing', () => {
        playerLoading.style.opacity = '0';
        updateLatency();
    });
}

function updateClock() {
    const now = new Date();
    currentTimeEl.textContent = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
}

function updateLatency() {
    const latency = getRandomLatency();
    document.getElementById('latency-val').textContent = `${latency} ms`;
}

function renderCategories() {
    const cats = ['ALL', ...new Set(channels.map(c => c.category.toUpperCase()))];
    
    const getCount = (cat) => {
        if (cat === 'ALL') return channels.length;
        return channels.filter(c => c.category.toUpperCase() === cat).length;
    };

    categoriesNav.innerHTML = cats.map(cat => `
        <button
            class="nav-btn w-full flex items-center justify-between px-4 py-3 text-xs font-mono uppercase tracking-widest transition-all ${activeCategory === cat ? 'active' : 'text-white/20 hover:text-white/60'}"
            data-category="${cat}"
        >
            <span>${cat.replace('_', ' ')}</span>
            <span class="text-[10px] opacity-30">${getCount(cat)}</span>
        </button>
    `).join('');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeCategory = btn.dataset.category;
            renderCategories();
            renderChannels();
        });
    });
}

function renderChannels() {
    const filtered = channels.filter(c => {
        const matchesCat = activeCategory === 'ALL' || 
                          c.category.toUpperCase() === activeCategory;
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
    });

    document.getElementById('channel-count').textContent = `${filtered.length.toString().padStart(2, '0')}_NODES_FOUND`;

    channelGrid.innerHTML = filtered.map(c => createChannelCard(c, selectedChannel?.id === c.id, favorites.includes(c.id))).join('');

    document.querySelectorAll('.channel-row').forEach(row => {
        row.addEventListener('click', () => {
            const channel = channels.find(c => c.id === row.dataset.id);
            if (channel) selectChannel(channel);
        });
    });

    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(btn.dataset.id);
        });
    });
}

function toggleFavorite(id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(favId => favId !== id);
    } else {
        favorites.push(id);
    }
    saveToStorage('nexstream_favorites', favorites);
    renderCategories();
    renderChannels();
}

function selectChannel(channel) {
    selectedChannel = channel;
    activeServerIndex = 0;
    saveToStorage('nexstream_last_channel', channel.id);
    
    document.getElementById('player-title').textContent = channel.name;
    document.getElementById('player-code').textContent = `CODE: ${channel.code}`;
    document.getElementById('player-description').textContent = channel.description;
    
    renderServers();
    playStream(channel.servers[0].url);
    renderChannels();
}

function renderServers() {
    if (!selectedChannel) return;
    
    document.getElementById('active-server-name').textContent = selectedChannel.servers[activeServerIndex].name.toUpperCase().replace(' ', '_');

    serverList.innerHTML = createServerList(selectedChannel.servers, activeServerIndex);

    document.querySelectorAll('.server-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeServerIndex = parseInt(btn.dataset.index);
            renderServers();
            playStream(selectedChannel.servers[activeServerIndex].url);
        });
    });
}

function playStream(url) {
    playerLoading.style.opacity = '1';
    
    if (hlsInstance) {
        hlsInstance.destroy();
    }

    hlsInstance = initHlsPlayer(videoPlayer, url, {
        onManifestParsed: (levels) => {
            renderQualityMenu(levels);
        },
        onQualityChanged: (quality) => {
            currentQualityEl.textContent = quality;
        }
    });
}

function renderQualityMenu(levels) {
    qualityMenu.innerHTML = createQualityMenu(levels, hlsInstance.currentLevel);

    document.querySelectorAll('.quality-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            hlsInstance.currentLevel = index;
            currentQualityEl.textContent = btn.textContent.trim();
            renderQualityMenu(levels);
        });
    });
}

function updateVolumeIcon() {
    const volumeIcon = document.getElementById('volume-icon');
    if (isMuted || videoPlayer.volume === 0) {
        volumeIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
        muteBtn.classList.add('text-red-500');
    } else {
        volumeIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>';
        muteBtn.classList.remove('text-red-500');
    }
}

init();
