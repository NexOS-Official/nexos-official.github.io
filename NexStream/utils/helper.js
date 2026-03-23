export function formatViewerCount(count) {
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
}

export function getRandomLatency(min = 20, max = 70) {
    return Math.floor(Math.random() * (max - min)) + min;
}
