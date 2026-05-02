export interface SpokenArticleMeta {
	attachment_id: number;
	audio_url: string;
	duration: string;
}

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

export interface AbilityOutput {
	error: string;
	audio_id: number;
	audio_url: string;
	duration: string;
}

export interface TtsTextResult {
	text: string;
	charCount: number;
	/**
	 * True when the AI summarization step actually ran and produced the
	 * text. False when the server fell back to returning the raw post text
	 * (e.g., the AI client was unavailable or generation errored).
	 */
	wasSummarized?: boolean;
	/**
	 * Machine-readable reason when `wasSummarized` is false, e.g.
	 * 'ai_client_unavailable', 'prompt_builder_error',
	 * 'generate_text_error', or 'summary_too_short'.
	 */
	fallbackReason?: string;
}
