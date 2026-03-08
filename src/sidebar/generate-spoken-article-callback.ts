/**
 * Generation callback for the prc-spoken-article/generate client-side ability.
 *
 * Fetches TTS text from WP REST, calls ElevenLabs API, uploads audio to media library.
 */

export interface PRCSpokenArticleConfig {
	enabled: boolean;
	elevenlabs: {
		apiKey: string;
		voiceId: string;
		model: string;
		stability: number;
		similarityBoost: number;
	};
	restBase: string;
	mediaUrl: string;
	restNonce: string;
}

interface AbilityInput {
	post_id: number;
}

export interface AbilityOutput {
	error: string;
	audio_id: number;
	audio_url: string;
	duration: string;
}

export interface TtsTextResult {
	text: string;
	charCount: number;
}

function errResult(msg: string): AbilityOutput {
	return { error: msg, audio_id: 0, audio_url: '', duration: '' };
}

/**
 * Fetch the TTS-ready text for a post from the WP REST endpoint.
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
	const { elevenlabs, mediaUrl, restNonce } = config;
	if (!elevenlabs?.apiKey) {
		return errResult('ElevenLabs API key is not configured.');
	}

	try {
		const elUrl = `https://api.elevenlabs.io/v1/text-to-speech/${elevenlabs.voiceId}`;
		const elRes = await fetch(elUrl, {
			method: 'POST',
			headers: {
				Accept: 'audio/mpeg',
				'Content-Type': 'application/json',
				'xi-api-key': elevenlabs.apiKey,
			},
			body: JSON.stringify({
				text,
				model_id: elevenlabs.model,
				voice_settings: {
					stability: elevenlabs.stability,
					similarity_boost: elevenlabs.similarityBoost,
				},
			}),
		});

		if (!elRes.ok) {
			const body = await elRes.text();
			return errResult(`ElevenLabs API error: ${elRes.status} - ${body}`);
		}

		const audioBlob = await elRes.blob();

		const filename = `spoken-article-${postId}-${Date.now()}.mp3`;
		const formData = new FormData();
		formData.append('file', audioBlob, filename);
		formData.append('post', String(postId));

		const uploadRes = await fetch(mediaUrl, {
			method: 'POST',
			headers: { 'X-WP-Nonce': restNonce },
			body: formData,
		});

		if (!uploadRes.ok) {
			const body = await uploadRes.text();
			return errResult(
				`Failed to upload audio: ${uploadRes.status} - ${body}`
			);
		}

		const media = (await uploadRes.json()) as {
			id: number;
			source_url: string;
			media_details?: { length_formatted?: string; length?: number };
		};

		// Flag the attachment so it's hidden from the media library.
		await fetch(`${mediaUrl}/${media.id}`, {
			method: 'POST',
			headers: {
				'X-WP-Nonce': restNonce,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ meta: { isSpokenArticleAudio: true } }),
		}).catch(() => {});

		let duration = 'Unknown';
		const details = media.media_details;
		if (details?.length_formatted) {
			duration = details.length_formatted;
		} else if (typeof details?.length === 'number') {
			const s = Math.floor(details.length);
			duration = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
		}

		return {
			error: '',
			audio_id: media.id,
			audio_url: media.source_url,
			duration,
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return errResult(
			message || 'An unexpected error occurred while generating audio.'
		);
	}
}

/**
 * Creates the ability callback that performs the full TTS generation flow.
 * Used by the @wordpress/abilities registration.
 */
export function createGenerateSpokenArticleCallback(
	config: PRCSpokenArticleConfig
): (input: AbilityInput) => Promise<AbilityOutput> {
	return async (input: AbilityInput): Promise<AbilityOutput> => {
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
