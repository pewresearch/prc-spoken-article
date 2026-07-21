import { __ } from '@wordpress/i18n';

import {
	coerceElevenLabsModel,
	DEFAULT_ELEVENLABS_MODEL,
	ELEVENLABS_MODELS,
} from './elevenlabs-models';
import type { PRCSpokenArticleConfig } from './types';

export type AudioQualityTier = 'draft' | 'production';

export function isAudioQualityTier(value: string): value is AudioQualityTier {
	return value === 'draft' || value === 'production';
}

export function getElevenLabsConfig():
	| PRCSpokenArticleConfig['elevenlabs']
	| null {
	return window.PRCSpokenArticleAI?.elevenlabs ?? null;
}

export function getModelForQualityTier(tier: AudioQualityTier): string {
	const config = getElevenLabsConfig();

	if (tier === 'draft') {
		return coerceElevenLabsModel(config?.draftModel ?? 'eleven_flash_v2_5');
	}

	return coerceElevenLabsModel(
		config?.productionModel ?? config?.model ?? DEFAULT_ELEVENLABS_MODEL
	);
}

export function getModelLabelForQualityTier(tier: AudioQualityTier): string {
	const modelId = getModelForQualityTier(tier);
	return (
		ELEVENLABS_MODELS.find((entry) => entry.value === modelId)?.label ??
		modelId
	);
}

export function getAudioQualityLabel(quality: string): string {
	if (quality === 'production') {
		return __('Production quality', 'prc-spoken-article');
	}

	if (quality === 'draft') {
		return __('Draft quality', 'prc-spoken-article');
	}

	// Legacy spoken articles predate quality meta; treat as unspecified.
	return __('Unknown quality', 'prc-spoken-article');
}

declare global {
	interface Window {
		PRCSpokenArticleAI?: PRCSpokenArticleConfig;
	}
}
