/* eslint-disable max-lines */
/**
 * WordPress Dependencies
 */
import { store, getContext, getElement } from '@wordpress/interactivity';

/**
 * Internal Dependencies
 */
import { SPEEDS, formatTime, isIOS } from './utils';
import {
	saveState,
	clearState,
	getSavedState,
	saveQueue,
	loadQueue,
} from './session-storage';
import { getUserHeaders, isUserLoggedIn } from './user-auth';
import {
	registerMediaSessionHandlers,
	updateMediaSessionMetadata,
	updateMediaSessionPosition,
} from './media-session';
import { setBlockRoot, getAudio, getDialog, loadAndPlay } from './audio-engine';

const restBase = window.prcPlatform.siteUrl;
let restored = false;
let libraryFetched = false;
let lastSaveTime = 0;
let pendingHistoryEntry = null;
let savedArticleTitle = '';
let pendingInterstitialAudioUrl = '';

const { state, actions } = store('prc-spoken-article/player', {
	state: {
		pendingAudio: null,
		queue: [],
		userLibrary: { history: {}, saved: {} },
		isLibraryOpen: false,
		libraryTab: 'queue',
		queueAddedToast: '',

		get isUserLoggedIn() {
			return isUserLoggedIn();
		},

		get showIOSResumePrompt() {
			const ctx = getContext();
			return isIOS() && ctx.hasAudio && !ctx.isPlaying && !ctx.isExpanded;
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

		get currentArticleSaved() {
			const ctx = getContext();
			if (!ctx.postId || !state.userLibrary?.saved) {
				return false;
			}
			return !!state.userLibrary.saved[String(ctx.postId)];
		},

		get isQueueTab() {
			return state.libraryTab === 'queue';
		},
		get isSavedTab() {
			return state.libraryTab === 'saved';
		},
		get isHistoryTab() {
			return state.libraryTab === 'history';
		},

		get hasQueueItems() {
			return state.queue.length > 0;
		},
		get hasSavedItems() {
			return state.savedList.length > 0;
		},
		get hasHistoryItems() {
			return state.historyList.length > 0;
		},

		get historyList() {
			const history = state.userLibrary?.history || {};
			return Object.entries(history)
				.map(([id, item]) => ({
					...item,
					postId: id,
				}))
				.sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
		},

		get savedList() {
			const saved = state.userLibrary?.saved || {};
			return Object.entries(saved)
				.map(([id, item]) => ({
					...item,
					postId: id,
				}))
				.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
		},
	},
	actions: {
		requestPlay() {
			const ctx = getContext();
			state.pendingAudio = {
				audioUrl: ctx.audioUrl,
				postTitle: ctx.postTitle,
				postUrl: ctx.postUrl,
				postId: ctx.postId,
				duration: ctx.duration,
				playCountEndpoint: ctx.playCountEndpoint,
				interstitialAudioUrl: ctx.interstitialAudioUrl || '',
				interstitialDuration: ctx.interstitialDuration || '',
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
			state.isLibraryOpen = false;
			clearState();
		},

		onDialogClose() {
			const context = getContext();
			context.isPlayerOpen = false;
			context.isPlaying = false;
			context.isExpanded = false;
			state.isLibraryOpen = false;
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

					actions.logToHistory();
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

			if (context.isPlayingInterstitial) {
				context.isPlayingInterstitial = false;
				context.postTitle = savedArticleTitle;
				savedArticleTitle = '';

				if (state.queue.length > 0) {
					const next = state.queue[0];
					state.queue = state.queue.slice(1);
					saveQueue(state.queue);

					context.audioUrl = next.audioUrl;
					context.postTitle = next.postTitle;
					context.postUrl = next.postUrl;
					context.postId = next.postId;
					context.duration = next.duration;
					context.playCountEndpoint = next.playCountEndpoint;
					context.hasTrackedPlay = false;
					context.hasAudio = true;

					pendingInterstitialAudioUrl =
						next.interstitialAudioUrl || '';

					loadAndPlay(context, next.audioUrl);
					return;
				}

				context.isPlaying = false;
				context.currentTime = 0;
				clearState();
				return;
			}

			if (pendingInterstitialAudioUrl) {
				savedArticleTitle = context.postTitle;
				context.postTitle =
					context.interstitialLabel ||
					'A message from Pew Research Center';
				context.isPlayingInterstitial = true;

				const interstitialUrl = pendingInterstitialAudioUrl;
				pendingInterstitialAudioUrl = '';

				loadAndPlay(context, interstitialUrl);
				return;
			}

			if (state.queue.length > 0) {
				const next = state.queue[0];
				state.queue = state.queue.slice(1);
				saveQueue(state.queue);

				context.audioUrl = next.audioUrl;
				context.postTitle = next.postTitle;
				context.postUrl = next.postUrl;
				context.postId = next.postId;
				context.duration = next.duration;
				context.playCountEndpoint = next.playCountEndpoint;
				context.hasTrackedPlay = false;
				context.hasAudio = true;

				pendingInterstitialAudioUrl = next.interstitialAudioUrl || '';

				loadAndPlay(context, next.audioUrl);
				return;
			}

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
			if (context.isPlayingInterstitial) {
				return;
			}
			const audio = getAudio();
			if (!audio) {
				return;
			}
			audio.currentTime = Math.max(0, audio.currentTime - 15);
			context.currentTime = audio.currentTime;
		},

		skipForward() {
			const context = getContext();
			if (context.isPlayingInterstitial) {
				return;
			}
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

		addToQueue() {
			const ctx = getContext();
			const item = {
				audioUrl: ctx.audioUrl,
				postTitle: ctx.postTitle,
				postUrl: ctx.postUrl,
				postId: ctx.postId,
				duration: ctx.duration,
				playCountEndpoint: ctx.playCountEndpoint,
				interstitialAudioUrl: ctx.interstitialAudioUrl || '',
				interstitialDuration: ctx.interstitialDuration || '',
			};
			const alreadyQueued = state.queue.some(
				(q) => q.postId === item.postId
			);
			if (alreadyQueued) {
				return;
			}
			state.queue = [...state.queue, item];
			saveQueue(state.queue);

			state.queueAddedToast = `Added to queue`;
			setTimeout(() => {
				state.queueAddedToast = '';
			}, 2000);
		},

		removeFromQueue() {
			const ctx = getContext();
			const postId = ctx.item?.postId;
			if (postId == null) {
				return;
			}
			state.queue = state.queue.filter((q) => q.postId !== postId);
			saveQueue(state.queue);
		},

		playFromQueue() {
			const ctx = getContext();
			const postId = ctx.item?.postId;
			if (postId == null) {
				return;
			}
			const idx = state.queue.findIndex((q) => q.postId === postId);
			if (idx < 0) {
				return;
			}
			const item = state.queue[idx];
			state.queue = state.queue.filter((_, i) => i !== idx);
			saveQueue(state.queue);

			state.pendingAudio = {
				audioUrl: item.audioUrl,
				postTitle: item.postTitle,
				postUrl: item.postUrl,
				postId: item.postId,
				duration: item.duration,
				playCountEndpoint: item.playCountEndpoint,
				interstitialAudioUrl: item.interstitialAudioUrl || '',
				interstitialDuration: item.interstitialDuration || '',
			};
		},

		playFromLibrary() {
			const ctx = getContext();
			const item = ctx.item;
			if (!item) {
				return;
			}

			state.pendingAudio = {
				audioUrl: item.audioUrl,
				postTitle: item.postTitle,
				postUrl: item.postUrl,
				postId: parseInt(item.postId, 10),
				duration: item.duration,
				playCountEndpoint: `${restBase}/wp-json/prc-spoken-article/v1/play-count/${item.postId}`,
			};
		},

		logToHistory() {
			const ctx = getContext();
			if (!ctx.postId) {
				return;
			}

			const postId = String(ctx.postId);
			const now = Math.floor(Date.now() / 1000);

			state.userLibrary = {
				...state.userLibrary,
				history: {
					...state.userLibrary.history,
					[postId]: {
						postTitle: ctx.postTitle,
						audioUrl: ctx.audioUrl,
						postUrl: ctx.postUrl,
						duration: ctx.duration,
						lastPlayedAt: now,
						playProgress: ctx.currentTime || 0,
					},
				},
			};

			const payload = {
				postId: ctx.postId,
				postTitle: ctx.postTitle,
				audioUrl: ctx.audioUrl,
				postUrl: ctx.postUrl,
				duration: ctx.duration,
				playProgress: ctx.currentTime || 0,
			};

			const headers = getUserHeaders();
			if (!headers) {
				pendingHistoryEntry = payload;
				return;
			}

			actions._postHistory(payload, headers);
		},

		_postHistory(payload, headers) {
			pendingHistoryEntry = null;
			fetch(
				`${restBase}/wp-json/prc-api/v3/user-accounts/listening-history`,
				{
					method: 'POST',
					headers,
					body: JSON.stringify(payload),
				}
			).catch(() => {});
		},

		fetchListeningHistory() {
			const headers = getUserHeaders();
			if (!headers) {
				return;
			}

			fetch(
				`${restBase}/wp-json/prc-api/v3/user-accounts/listening-history`,
				{
					method: 'GET',
					headers,
				}
			)
				.then((r) => r.json())
				.then((data) => {
					state.userLibrary = {
						...state.userLibrary,
						history: data || {},
					};
				})
				.catch(() => {});
		},

		toggleLibrary() {
			state.isLibraryOpen = !state.isLibraryOpen;
			const ctx = getContext();
			if (!ctx.isExpanded) {
				ctx.isExpanded = true;
			}
		},

		setLibraryTab() {
			const ctx = getContext();
			if (ctx.tabName) {
				state.libraryTab = ctx.tabName;
			}
		},

		clearHistory() {
			const headers = getUserHeaders();
			if (!headers) {
				return;
			}

			state.userLibrary = {
				...state.userLibrary,
				history: {},
			};

			fetch(
				`${restBase}/wp-json/prc-api/v3/user-accounts/listening-history`,
				{
					method: 'DELETE',
					headers,
				}
			).catch(() => {});
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
			setBlockRoot(ref);

			registerMediaSessionHandlers(ref);

			state.queue = loadQueue();

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
		 * Reactive watcher — fetches listening history once
		 * the user-accounts store reports a logged-in user.
		 * Saved articles are fetched and pushed in by the
		 * prc-user-accounts/saved-articles store.
		 */
		onAuthReady() {
			if (libraryFetched || !state.isUserLoggedIn) {
				return;
			}
			const headers = getUserHeaders();
			if (!headers) {
				return;
			}
			libraryFetched = true;
			actions.fetchListeningHistory();
			if (pendingHistoryEntry) {
				actions._postHistory(pendingHistoryEntry, headers);
			}
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

			pendingInterstitialAudioUrl = pending.interstitialAudioUrl || '';

			state.pendingAudio = null;

			loadAndPlay(ctx, pending.audioUrl);
		},
	},
});
