import { clearState } from './session-storage';

export function updateMediaSessionMetadata(ctx) {
	if (!('mediaSession' in navigator)) {
		return;
	}
	navigator.mediaSession.metadata = new MediaMetadata({
		title: ctx.postTitle,
		artist: 'Pew Research Center',
		album: 'Spoken Articles',
	});
}

export function updateMediaSessionPosition(ctx) {
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

/**
 * Registers Media Session API action handlers for OS-level playback controls.
 *
 * @param {HTMLElement} root The player block root element.
 */
export function registerMediaSessionHandlers(root) {
	if (!('mediaSession' in navigator) || !root) {
		return;
	}

	const getAudio = () => root.querySelector('[data-wp-ref="audioElement"]');
	const getDialog = () => root.querySelector('[data-wp-ref="playerDialog"]');

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
