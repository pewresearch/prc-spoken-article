import type { PRCSpokenArticleConfig, AbilityOutput } from './types';

function errResult(msg: string): AbilityOutput {
	return { error: msg, audio_id: 0, audio_url: '', duration: '' };
}

/**
 * Generate audio via the WP ElevenLabs TTS proxy and upload to the media library.
 *
 * @param config  ElevenLabs + REST configuration.
 * @param text    The text to convert to speech.
 * @param postId  Optional parent post ID for the media upload. Pass 0 for admin-created interstitials.
 */
export async function generateAudioFromText(
	config: PRCSpokenArticleConfig,
	text: string,
	postId: number = 0
): Promise<AbilityOutput> {
	const { elevenlabs, mediaUrl, restNonce, restBase } = config;
	if (!elevenlabs?.connected) {
		return errResult('ElevenLabs API key is not configured.');
	}

	if (!restBase) {
		return errResult('Spoken article REST base is not configured.');
	}

	try {
		const ttsRes = await fetch(`${restBase}/elevenlabs/tts`, {
			method: 'POST',
			headers: {
				Accept: 'audio/mpeg',
				'Content-Type': 'application/json',
				'X-WP-Nonce': restNonce,
			},
			body: JSON.stringify({
				text,
				voice_id: elevenlabs.voiceId,
				model_id: elevenlabs.model,
				voice_settings: {
					stability: elevenlabs.stability,
					similarity_boost: elevenlabs.similarityBoost,
				},
			}),
		});

		if (!ttsRes.ok) {
			const body = await ttsRes.text();
			let message = `ElevenLabs TTS proxy error: ${ttsRes.status}`;
			try {
				const json = JSON.parse(body) as {
					message?: string;
					code?: string;
				};
				if (json.message) {
					message = json.message;
				}
			} catch {
				if (body) {
					message = `${message} - ${body}`;
				}
			}
			return errResult(message);
		}

		const audioBlob = await ttsRes.blob();
		const filename = postId
			? `spoken-article-interstitial-${postId}-${Date.now()}.mp3`
			: `spoken-article-interstitial-${Date.now()}.mp3`;
		const formData = new FormData();
		formData.append('file', audioBlob, filename);
		if (postId) {
			formData.append('post', String(postId));
		}

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

		await fetch(`${mediaUrl}/${media.id}`, {
			method: 'POST',
			headers: {
				'X-WP-Nonce': restNonce,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ meta: { prc_hide_media: true } }),
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
