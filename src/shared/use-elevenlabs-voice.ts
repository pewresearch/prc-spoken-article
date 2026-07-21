import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';

import type { ElevenLabsVoice } from './voice-types';

interface UseElevenLabsVoiceResult {
	voice: ElevenLabsVoice | null;
	isLoading: boolean;
	error: string;
}

export default function useElevenLabsVoice(
	voiceId: string
): UseElevenLabsVoiceResult {
	const [voice, setVoice] = useState<ElevenLabsVoice | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!voiceId) {
			setVoice(null);
			setError('');
			setIsLoading(false);
			return;
		}

		const config = window.PRCSpokenArticleAI;
		if (
			!config?.elevenlabs?.connected ||
			!config.restBase ||
			!config.restNonce
		) {
			setVoice(null);
			setError(
				__(
					'ElevenLabs API key is not configured.',
					'prc-spoken-article'
				)
			);
			return;
		}

		let cancelled = false;
		setIsLoading(true);
		setError('');

		fetch(
			`${config.restBase}/elevenlabs/voices/${encodeURIComponent(voiceId)}`,
			{
				headers: {
					'X-WP-Nonce': config.restNonce,
					Accept: 'application/json',
				},
			}
		)
			.then(async (response) => {
				if (!response.ok) {
					const body = await response.text();
					throw new Error(
						body || `Voice proxy error: ${response.status}`
					);
				}

				return response.json() as Promise<ElevenLabsVoice>;
			})
			.then((data) => {
				if (!cancelled) {
					setVoice(data);
				}
			})
			.catch((fetchError) => {
				if (!cancelled) {
					setVoice(null);
					setError(
						fetchError instanceof Error
							? fetchError.message
							: __('Failed to fetch voice.', 'prc-spoken-article')
					);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setIsLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [voiceId]);

	return { voice, isLoading, error };
}
