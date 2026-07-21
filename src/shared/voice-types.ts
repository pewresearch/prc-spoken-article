export interface ElevenLabsVoice {
	voice_id: string;
	name: string;
	category?: string;
	description?: string;
	preview_url?: string;
	labels?: Record<string, string>;
}

export function formatVoiceLabels(labels?: Record<string, string>): string {
	if (!labels) {
		return '';
	}

	return Object.values(labels).slice(0, 3).join(', ');
}

export function formatVoiceMeta(voice: ElevenLabsVoice): string {
	return [voice.category, formatVoiceLabels(voice.labels)]
		.filter(Boolean)
		.join(' · ');
}
