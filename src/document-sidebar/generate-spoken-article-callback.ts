/**
 * Generation callback for the prc-spoken-article/generate client-side ability.
 *
 * Fetches TTS text from WP REST (using the parent post), calls ElevenLabs API,
 * uploads audio to the media library.
 */

import { generateAudioFromText as sharedGenerateAudio } from '../shared/generate-audio-callback';
import type {
	PRCSpokenArticleConfig,
	AbilityOutput,
	TtsTextResult,
} from '../shared/types';

export type { PRCSpokenArticleConfig, AbilityOutput, TtsTextResult };

function errResult(msg: string): AbilityOutput {
	return { error: msg, audio_id: 0, audio_url: '', duration: '' };
}

/**
 * Fetch the TTS-ready text for a post from the WP REST endpoint.
 * Accepts either a parent post ID or a spoken-article CPT ID.
 */
export async function fetchTtsText(
	config: PRCSpokenArticleConfig,
	postId: number,
	targetMinutes?: number
): Promise<TtsTextResult> {
	let url = `${config.restBase}/tts-text/${postId}`;
	if (targetMinutes) {
		url += `?target_minutes=${targetMinutes}`;
	}
	const res = await fetch(url, {
		headers: {
			'X-WP-Nonce': config.restNonce,
			Accept: 'application/json',
		},
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(
			`Failed to get post text: ${res.status} ${body || res.statusText}`
		);
	}

	return (await res.json()) as TtsTextResult;
}

/**
 * Generate audio from provided text via ElevenLabs and upload to the WP media library.
 */
export async function generateAudioFromText(
	config: PRCSpokenArticleConfig,
	postId: number,
	text: string
): Promise<AbilityOutput> {
	return sharedGenerateAudio(config, text, postId);
}

/**
 * Creates the ability callback that performs the full TTS generation flow.
 * Used by the @wordpress/abilities registration.
 */
export function createGenerateSpokenArticleCallback(
	config: PRCSpokenArticleConfig
): (input: { post_id: number }) => Promise<AbilityOutput> {
	return async (input: { post_id: number }): Promise<AbilityOutput> => {
		const postId = input?.post_id;
		if (!postId) {
			return errResult('Post ID is required.');
		}

		try {
			const { text } = await fetchTtsText(config, postId);
			if (!text || text.length < 10) {
				return errResult('Not enough text content to generate audio.');
			}
			return generateAudioFromText(config, postId, text);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return errResult(message);
		}
	};
}
