export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function isIOS() {
	return (
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
	);
}

export function formatTime(seconds) {
	if (!seconds || !isFinite(seconds)) {
		return '0:00';
	}
	const s = Math.floor(seconds);
	const m = Math.floor(s / 60);
	const sec = s % 60;
	return `${m}:${String(sec).padStart(2, '0')}`;
}
