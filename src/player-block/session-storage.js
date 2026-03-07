const STORAGE_KEY = 'prc-spoken-article-playback';
const QUEUE_STORAGE_KEY = 'prc-spoken-article-queue';
const STALE_MS = 24 * 60 * 60 * 1000;

export function saveState(ctx) {
	try {
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				audioUrl: ctx.audioUrl,
				postTitle: ctx.postTitle,
				postId: ctx.postId,
				postUrl: ctx.postUrl,
				currentTime: ctx.currentTime,
				playbackRate: ctx.playbackRate,
				isPlaying: ctx.isPlaying,
				isExpanded: ctx.isExpanded,
				duration: ctx.duration,
				playCountEndpoint: ctx.playCountEndpoint,
				hasTrackedPlay: ctx.hasTrackedPlay,
				savedAt: Date.now(),
			})
		);
	} catch {
		// Storage full or unavailable — ignore.
	}
}

export function clearState() {
	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		// Ignore.
	}
}

export function getSavedState() {
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return null;
		}
		const state = JSON.parse(raw);
		if (Date.now() - (state.savedAt || 0) > STALE_MS) {
			sessionStorage.removeItem(STORAGE_KEY);
			return null;
		}
		return state;
	} catch {
		return null;
	}
}

export function saveQueue(queue) {
	try {
		sessionStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
	} catch {
		// Ignore.
	}
}

export function loadQueue() {
	try {
		const raw = sessionStorage.getItem(QUEUE_STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}
