export function initHlsPlayer(videoElement, url, { onManifestParsed, onQualityChanged }) {
    if (Hls.isSupported()) {
        const hls = new Hls({
            capLevelToPlayerSize: true,
            autoStartLoad: true
        });
        
        hls.loadSource(url);
        hls.attachMedia(videoElement);
        
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            if (onManifestParsed) onManifestParsed(data.levels);
            videoElement.play();
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
            if (onQualityChanged) {
                const level = hls.levels[data.level];
                onQualityChanged(level ? `${level.height}P` : 'AUTO');
            }
        });

        return hls;
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = url;
        videoElement.addEventListener('loadedmetadata', () => {
            videoElement.play();
        });
        return null;
    }
}
