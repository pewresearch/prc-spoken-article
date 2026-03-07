import { saveState, clearState } from './session-storage';
import { updateMediaSessionMetadata } from './media-session';

let blockRoot = null;

export function setBlockRoot(el) {
	blockRoot = el;
}

export function getAudio() {
	return blockRoot?.querySelector('[data-wp-ref="audioElement"]');
}

export function getDialog() {
	return blockRoot?.querySelector('[data-wp-ref="playerDialog"]');
}

/**
 * Loads audio into the player and starts playback.
 * Shared by both onPendingAudio (trigger click) and onInit (session restore).
 */
export function loadAndPlay(ctx, audioUrl, savedTime = 0, shouldPlay = true) {
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
