/**
 * WordPress Dependencies
 */
import { store, getContext, getElement } from '@wordpress/interactivity';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const STORAGE_KEY = 'prc-spoken-article-playback';
const STALE_MS = 24 * 60 * 60 * 1000;

function isIOS() {
	return (
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
	);
}

let restored = false;
let lastSaveTime = 0;
let blockRoot = null;

function formatTime(seconds) {
	if (!seconds || !isFinite(seconds)) {
		return '0:00';
	}
	const s = Math.floor(seconds);
	const m = Math.floor(s / 60);
	const sec = s % 60;
	return `${m}:${String(sec).padStart(2, '0')}`;
}

function getAudio() {
	return blockRoot?.querySelector('[data-wp-ref="audioElement"]');
}

function getDialog() {
	return blockRoot?.querySelector('[data-wp-ref="playerDialog"]');
}

function saveState(ctx) {
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

function clearState() {
	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		// Ignore.
	}
}

function getSavedState() {
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

function updateMediaSessionMetadata(ctx) {
	if (!('mediaSession' in navigator)) {
		return;
	}
	navigator.mediaSession.metadata = new MediaMetadata({
		title: ctx.postTitle,
		artist: 'Pew Research Center',
		album: 'Spoken Articles',
	});
}

function updateMediaSessionPosition(ctx) {
	if (!('mediaSession' in navigator) || !ctx.totalDuration) {
		return;
	}
	try {
		navigator.mediaSession.setPositionState({
			duration: ctx.totalDuration,
			playbackRate: ctx.playbackRate,
			position: Math.min(ctx.currentTime, ctx.totalDuration),
		});
	} catch {
		// Some browsers reject invalid position values.
	}
}

function registerMediaSessionHandlers() {
	if (!('mediaSession' in navigator) || !blockRoot) {
		return;
	}

	navigator.mediaSession.setActionHandler('play', () => {
		const audio = getAudio();
		if (audio) {
			audio.play();
		}
	});

	navigator.mediaSession.setActionHandler('pause', () => {
		const audio = getAudio();
		if (audio) {
			audio.pause();
		}
	});

	navigator.mediaSession.setActionHandler('stop', () => {
		const audio = getAudio();
		const dialog = getDialog();
		if (audio) {
			audio.pause();
			audio.currentTime = 0;
		}
		if (dialog?.open) {
			dialog.close();
		}
		clearState();
	});

	navigator.mediaSession.setActionHandler('seekbackward', () => {
		const audio = getAudio();
		if (audio) {
			audio.currentTime = Math.max(0, audio.currentTime - 15);
		}
	});

	navigator.mediaSession.setActionHandler('seekforward', () => {
		const audio = getAudio();
		if (audio) {
			audio.currentTime = Math.min(
				audio.duration || 0,
				audio.currentTime + 15
			);
		}
	});

	navigator.mediaSession.setActionHandler('seekto', (details) => {
		const audio = getAudio();
		if (audio && details.seekTime != null) {
			audio.currentTime = details.seekTime;
		}
	});
}

/**
 * Loads audio into the player and starts playback.
 * Shared by both onPendingAudio (trigger click) and onInit (session restore).
 */
function loadAndPlay(ctx, audioUrl, savedTime = 0, shouldPlay = true) {
	const audio = getAudio();
	const dialog = getDialog();

	if (!audio) {
		return;
	}

	const onReady = () => {
		audio.removeEventListener('loadedmetadata', onReady);
		audio.removeEventListener('error', onError);

		if (isFinite(audio.duration)) {
			ctx.totalDuration = audio.duration;
		}

		if (savedTime > 0) {
			audio.currentTime = Math.min(savedTime, audio.duration || 0);
			ctx.currentTime = audio.currentTime;
		}

		audio.playbackRate = ctx.playbackRate;

		if (dialog && !dialog.open) {
			dialog.show();
		}
		ctx.isPlayerOpen = true;

		updateMediaSessionMetadata(ctx);

		if (shouldPlay) {
			audio.play().then(
				() => {
					ctx.isPlaying = true;
					saveState(ctx);
				},
				() => {
					ctx.isPlaying = false;
				}
			);
		}
	};

	const onError = () => {
		audio.removeEventListener('loadedmetadata', onReady);
		audio.removeEventListener('error', onError);
		clearState();
	};

	const source = audio.querySelector('source');
	const currentSrc = source?.getAttribute('src') || '';
	const sameSource = currentSrc === audioUrl;

	if (sameSource && audio.readyState >= 1) {
		onReady();
	} else {
		audio.addEventListener('loadedmetadata', onReady);
		audio.addEventListener('error', onError);
		if (!sameSource) {
			if (source) {
				source.src = audioUrl;
			}
			audio.load();
		}
	}
}

const { state } = store('prc-spoken-article/player', {
	state: {
		pendingAudio: null,

		get showIOSResumePrompt() {
			const ctx = getContext();
			return (
				isIOS() &&
				ctx.hasAudio &&
				!ctx.isPlaying &&
				!ctx.isExpanded
			);
		},

		get progressPercent() {
			const ctx = getContext();
			if (!ctx.totalDuration) {
				return 0;
			}
			return (ctx.currentTime / ctx.totalDuration) * 100;
		},
		get elapsedFormatted() {
			const ctx = getContext();
			return formatTime(ctx.currentTime);
		},
		get remainingFormatted() {
			const ctx = getContext();
			const remaining = Math.max(
				0,
				(ctx.totalDuration || 0) - (ctx.currentTime || 0)
			);
			return `-${formatTime(remaining)}`;
		},
		get speedLabel() {
			const ctx = getContext();
			return `${ctx.playbackRate}x`;
		},
	},
	actions: {
		/**
		 * Called by the trigger block's data-wp-on--click.
		 * Reads the trigger's context and writes to state.pendingAudio.
		 */
		requestPlay() {
			const ctx = getContext();
			state.pendingAudio = {
				audioUrl: ctx.audioUrl,
				postTitle: ctx.postTitle,
				postUrl: ctx.postUrl,
				postId: ctx.postId,
				duration: ctx.duration,
				playCountEndpoint: ctx.playCountEndpoint,
			};
		},

		closePlayer() {
			const context = getContext();
			const audio = getAudio();
			const dialog = getDialog();

			if (audio) {
				audio.pause();
			}
			if (dialog?.open) {
				dialog.close();
			}
			context.isPlaying = false;
			context.isPlayerOpen = false;
			context.isExpanded = false;
			clearState();
		},

		onDialogClose() {
			const context = getContext();
			context.isPlayerOpen = false;
			context.isPlaying = false;
			context.isExpanded = false;
			clearState();
		},

		toggleExpand() {
			const context = getContext();
			context.isExpanded = !context.isExpanded;
			saveState(context);
		},

		togglePlay() {
			const context = getContext();
			const audio = getAudio();
			const dialog = getDialog();

			if (!audio) {
				return;
			}

			if (!dialog?.open) {
				dialog?.show();
				context.isPlayerOpen = true;
			}

			if (context.isPlaying) {
				audio.pause();
				context.isPlaying = false;
			} else {
				audio.play();
				context.isPlaying = true;

				updateMediaSessionMetadata(context);

				if (!context.hasTrackedPlay) {
					context.hasTrackedPlay = true;

					if (typeof gtag === 'function') {
						gtag('event', 'spoken_article_play', {
							post_id: context.postId,
							article_title: context.postTitle,
							duration: context.duration,
						});
					}

					if (context.playCountEndpoint) {
						fetch(context.playCountEndpoint, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
						}).catch(() => {});
					}
				}
			}

			saveState(context);
		},

		updateTime() {
			const context = getContext();
			const audio = getAudio();

			if (audio && isFinite(audio.currentTime)) {
				context.currentTime = audio.currentTime;
			}

			const now = Date.now();
			if (now - lastSaveTime >= 1000) {
				lastSaveTime = now;
				saveState(context);
				updateMediaSessionPosition(context);
			}
		},

		onLoadedMetadata() {
			const context = getContext();
			const audio = getAudio();

			if (audio && isFinite(audio.duration)) {
				context.totalDuration = audio.duration;
			}
		},

		onEnded() {
			const context = getContext();
			context.isPlaying = false;
			context.currentTime = 0;
			clearState();
		},

		seek() {
			const context = getContext();
			const { ref } = getElement();
			const audio = getAudio();
			if (!audio || !context.totalDuration) {
				return;
			}
			const percent = parseFloat(ref.value);
			audio.currentTime = (percent / 100) * context.totalDuration;
			context.currentTime = audio.currentTime;
		},

		skipBack() {
			const context = getContext();
			const audio = getAudio();
			if (!audio) {
				return;
			}
			audio.currentTime = Math.max(0, audio.currentTime - 15);
			context.currentTime = audio.currentTime;
		},

		skipForward() {
			const context = getContext();
			const audio = getAudio();
			if (!audio) {
				return;
			}
			audio.currentTime = Math.min(
				audio.duration || 0,
				audio.currentTime + 15
			);
			context.currentTime = audio.currentTime;
		},

		increaseSpeed() {
			const context = getContext();
			const audio = getAudio();
			const idx = SPEEDS.indexOf(context.playbackRate);
			if (idx < SPEEDS.length - 1) {
				context.playbackRate = SPEEDS[idx + 1];
				if (audio) {
					audio.playbackRate = context.playbackRate;
				}
			}
		},

		decreaseSpeed() {
			const context = getContext();
			const audio = getAudio();
			const idx = SPEEDS.indexOf(context.playbackRate);
			if (idx > 0) {
				context.playbackRate = SPEEDS[idx - 1];
				if (audio) {
					audio.playbackRate = context.playbackRate;
				}
			}
		},
	},
	callbacks: {
		onInit() {
			if (restored) {
				return;
			}
			restored = true;

			const ctx = getContext();
			const { ref } = getElement();
			blockRoot = ref;

			registerMediaSessionHandlers();

			const saved = getSavedState();
			if (!saved || !saved.audioUrl) {
				return;
			}

			ctx.audioUrl = saved.audioUrl;
			ctx.postTitle = saved.postTitle || '';
			ctx.postUrl = saved.postUrl || '';
			ctx.duration = saved.duration || '';
			ctx.postId = saved.postId || 0;
			ctx.playCountEndpoint = saved.playCountEndpoint || '';
			ctx.playbackRate = saved.playbackRate || 1;
			ctx.hasTrackedPlay = saved.hasTrackedPlay || false;
			ctx.hasAudio = true;

			const wasExpanded = saved.isExpanded || false;
			ctx.isExpanded = wasExpanded;

			loadAndPlay(
				ctx,
				saved.audioUrl,
				saved.currentTime || 0,
				saved.isPlaying
			);
		},

		/**
		 * Reactive watcher on the player block root.
		 * Fires whenever state.pendingAudio changes.
		 */
		onPendingAudio() {
			const pending = state.pendingAudio;
			if (!pending) {
				return;
			}

			const ctx = getContext();
			ctx.audioUrl = pending.audioUrl;
			ctx.postTitle = pending.postTitle;
			ctx.postUrl = pending.postUrl;
			ctx.postId = pending.postId;
			ctx.duration = pending.duration;
			ctx.playCountEndpoint = pending.playCountEndpoint;
			ctx.hasTrackedPlay = false;
			ctx.hasAudio = true;

			// Clear the signal so it doesn't re-trigger.
			state.pendingAudio = null;

			loadAndPlay(ctx, pending.audioUrl);
		},
	},
});
