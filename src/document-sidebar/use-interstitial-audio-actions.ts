/**
 * WordPress Dependencies
 */
import { useState, useCallback } from '@wordpress/element';

/**
 * Internal Dependencies
 */
import { generateAudioFromText } from '../shared/generate-audio-callback';
import { useMediaAudioUpload } from '../shared/use-media-upload';
import type { PRCSpokenArticleConfig } from '../shared/types';

export interface InterstitialMeta {
	text: string;
	textIsDraft: boolean;
	audioUrl: string;
	attachmentId: number;
	duration: string;
	voiceId: string;
}

export function useInterstitialAudioActions(
	interstitial: InterstitialMeta,
	postId: number,
	onUpdateInterstitial: (updates: Partial<InterstitialMeta>) => void,
	setGeneratingLock: (active: boolean) => void
): {
	isGenerating: boolean;
	error: string;
	handleGenerateAudio: () => Promise<void>;
	handleUploadAudio: () => void;
} {
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState('');
	const { openAudioLibrary } = useMediaAudioUpload();

	const handleGenerateAudio = useCallback(async () => {
		const config: PRCSpokenArticleConfig = window.PRCSpokenArticleAI;
		if (!config?.elevenlabs?.connected) {
			setError('ElevenLabs API key is not configured.');
			return;
		}

		if (!interstitial.text || interstitial.text.length < 10) {
			setError('Text must be at least 10 characters.');
			return;
		}

		setGeneratingLock(true);
		setIsGenerating(true);
		setError('');

		try {
			const configWithVoice = interstitial.voiceId
				? {
						...config,
						elevenlabs: {
							...config.elevenlabs,
							voiceId: interstitial.voiceId,
						},
					}
				: config;

			const result = await generateAudioFromText(
				configWithVoice,
				interstitial.text,
				postId
			);

			if (result.error) {
				setError(result.error);
			} else {
				onUpdateInterstitial({
					audioUrl: result.audio_url,
					attachmentId: result.audio_id,
					duration: result.duration,
					textIsDraft: false,
				});
			}
		} finally {
			setIsGenerating(false);
			setGeneratingLock(false);
		}
	}, [
		interstitial.text,
		interstitial.voiceId,
		postId,
		onUpdateInterstitial,
		setGeneratingLock,
	]);

	const handleUploadAudio = useCallback(() => {
		setError('');
		openAudioLibrary({
			onSelect: ({ attachmentId, audioUrl, duration }) => {
				onUpdateInterstitial({
					audioUrl,
					attachmentId,
					duration,
					textIsDraft: false,
				});
			},
		});
	}, [onUpdateInterstitial, openAudioLibrary]);

	return {
		isGenerating,
		error,
		handleGenerateAudio,
		handleUploadAudio,
	};
}
