import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { __experimentalText as Text } from '@wordpress/components';
import {
	ConnectionBadge,
	SettingsPage,
	type SettingsFieldConfig,
} from '@prc/components';

import './style.scss';
import { store } from './store';
import { fetchInterstitials, saveInterstitials } from './api';
import InterstitialAdsSection from './components/interstitial-ads-section';
import {
	ELEVENLABS_MODEL_FIELD_HELP,
	ELEVENLABS_MODELS,
	getElevenLabsModelDescription,
} from '../shared/elevenlabs-models';

function ElevenLabsBadge() {
	const settings = useSelect((select) => select(store).getSettings(), []);

	return (
		<ConnectionBadge
			connected={settings.elevenlabs_connected}
			textDomain="prc-spoken-article"
		/>
	);
}

function ElevenLabsIntro() {
	const settings = useSelect((select) => select(store).getSettings(), []);

	if (!settings.api_key_via_constant) {
		return null;
	}

	return (
		<Text size={12} color="#757575">
			{__(
				'API key is set via the PRC_PLATFORM_ELEVENLABS_API_KEY constant.',
				'prc-spoken-article'
			)}
		</Text>
	);
}

function DraftModelDescription() {
	const model = useSelect(
		(select) => select(store).getSettings().elevenlabs_draft_model,
		[]
	);
	const description = getElevenLabsModelDescription(model);

	if (!description) {
		return null;
	}

	return (
		<Text size={12} color="#757575">
			{description}
		</Text>
	);
}

function ProductionModelDescription() {
	const model = useSelect(
		(select) => select(store).getSettings().elevenlabs_model,
		[]
	);
	const description = getElevenLabsModelDescription(model);

	if (!description) {
		return null;
	}

	return (
		<Text size={12} color="#757575">
			{description}
		</Text>
	);
}

const ELEVENLABS_SETTINGS_FIELDS: SettingsFieldConfig[] = [
	{
		id: 'elevenlabs_api_key',
		type: 'password',
		label: __('API Key', 'prc-spoken-article'),
		description: __(
			'Found in your ElevenLabs profile under API Keys.',
			'prc-spoken-article'
		),
		isVisible: (settings) => !settings.api_key_via_constant,
	},
	{
		id: 'elevenlabs_draft_model',
		type: 'select',
		label: __('Draft Model', 'prc-spoken-article'),
		description: `${ELEVENLABS_MODEL_FIELD_HELP} ${__(
			'Used when editors generate draft-quality spoken article audio.',
			'prc-spoken-article'
		)}`,
		options: ELEVENLABS_MODELS.map((entry) => ({
			value: entry.value,
			label: entry.optionLabel,
		})),
		annotation: () => <DraftModelDescription />,
	},
	{
		id: 'elevenlabs_model',
		type: 'select',
		label: __('Production Model', 'prc-spoken-article'),
		description: `${ELEVENLABS_MODEL_FIELD_HELP} ${__(
			'Used for production-quality spoken article audio and interstitial ads.',
			'prc-spoken-article'
		)}`,
		options: ELEVENLABS_MODELS.map((entry) => ({
			value: entry.value,
			label: entry.optionLabel,
		})),
		annotation: () => <ProductionModelDescription />,
	},
];

export default function InterstitialAdminApp() {
	return (
		<SettingsPage
			title={__('Spoken Article Settings', 'prc-spoken-article')}
			description={__(
				'Configure ElevenLabs defaults and manage audio interstitials for spoken articles.',
				'prc-spoken-article'
			)}
			textDomain="prc-spoken-article"
			idPrefix="prc-spoken-article-interstitial-settings"
			store={store}
			saveSettings={saveInterstitials}
			errorRetryLabel={__(
				'Please try again. If the problem persists, contact support.',
				'prc-spoken-article'
			)}
			sections={[
				{
					slug: 'elevenlabs-settings',
					title: __('ElevenLabs', 'prc-spoken-article'),
					description: __(
						'Configure the ElevenLabs API key and draft vs production text-to-speech models.',
						'prc-spoken-article'
					),
					fields: ELEVENLABS_SETTINGS_FIELDS,
					badge: () => <ElevenLabsBadge />,
					intro: () => <ElevenLabsIntro />,
				},
				{
					slug: 'interstitial-ads',
					title: __('Interstitial Ads', 'prc-spoken-article'),
					description: __(
						'Configure the player display label and manage audio ads that play between spoken article sections. Active ads are selected by weighted random.',
						'prc-spoken-article'
					),
					render: () => <InterstitialAdsSection />,
				},
			]}
			onLoad={fetchInterstitials}
		/>
	);
}
