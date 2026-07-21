import { __ } from '@wordpress/i18n';

export const DEFAULT_ELEVENLABS_MODEL = 'eleven_multilingual_v2';
export const DEFAULT_DRAFT_ELEVENLABS_MODEL = 'eleven_flash_v2_5';

export const DEPRECATED_ELEVENLABS_MODELS = [
	'eleven_monolingual_v1',
	'eleven_multilingual_v1',
] as const;

export const ELEVENLABS_MODEL_FIELD_HELP = __(
	'Models trade quality, speed, cost, and max length. Changing the model affects new generations only; existing audio is unchanged.',
	'prc-spoken-article'
);

export const ELEVENLABS_MODELS = [
	{
		value: 'eleven_multilingual_v2',
		label: __('Multilingual v2', 'prc-spoken-article'),
		optionLabel: __(
			'Multilingual v2 — best quality for articles (recommended)',
			'prc-spoken-article'
		),
		description: __(
			'Strong quality for long-form narration with good emotional range (~10k characters per request). Slower and usually costlier than Flash.',
			'prc-spoken-article'
		),
	},
	{
		value: 'eleven_flash_v2_5',
		label: __('Flash v2.5', 'prc-spoken-article'),
		optionLabel: __(
			'Flash v2.5 — faster and cheaper, slightly less natural',
			'prc-spoken-article'
		),
		description: __(
			'Fastest and most affordable option with the largest request size (~40k characters). Fine for drafts and interstitials; less natural than Multilingual v2 or Eleven v3.',
			'prc-spoken-article'
		),
	},
	{
		value: 'eleven_v3',
		label: __('Eleven v3', 'prc-spoken-article'),
		optionLabel: __(
			'Eleven v3 — highest quality, slower/costlier, shorter max length',
			'prc-spoken-article'
		),
		description: __(
			'Highest fidelity and emotional range, but slower, more expensive, and limited to ~5k characters per request — long articles may truncate sooner.',
			'prc-spoken-article'
		),
	},
] as const;

export type ElevenLabsModelId = (typeof ELEVENLABS_MODELS)[number]['value'];

export function isAllowedElevenLabsModel(
	model: string
): model is ElevenLabsModelId {
	return ELEVENLABS_MODELS.some((entry) => entry.value === model);
}

export function coerceElevenLabsModel(model: string): ElevenLabsModelId {
	if (
		DEPRECATED_ELEVENLABS_MODELS.includes(
			model as (typeof DEPRECATED_ELEVENLABS_MODELS)[number]
		)
	) {
		return DEFAULT_ELEVENLABS_MODEL;
	}

	return isAllowedElevenLabsModel(model) ? model : DEFAULT_ELEVENLABS_MODEL;
}

export function getElevenLabsModelDescription(model: string): string {
	const entry = ELEVENLABS_MODELS.find(
		(item) => item.value === coerceElevenLabsModel(model)
	);
	return entry?.description ?? '';
}
