import { __ } from '@wordpress/i18n';
import { SettingsPage, type SettingsFieldConfig } from '@prc/components';

import './style.scss';
import { store } from './store';
import { fetchInterstitials, saveInterstitials } from './api';
import InterstitialAdsSection from './components/interstitial-ads-section';

const TEXT_DOMAIN = 'prc-spoken-article';

const GENERAL_SETTINGS_FIELDS: SettingsFieldConfig[] = [
	{
		id: 'label',
		type: 'text',
		label: __('Player Display Label', TEXT_DOMAIN),
		description: __(
			'Shown in the audio player when an interstitial plays.',
			TEXT_DOMAIN
		),
	},
];

export default function InterstitialAdminApp() {
	return (
		<SettingsPage
			title={__('Spoken Article Interstitials', TEXT_DOMAIN)}
			description={__(
				'Manage audio interstitials that play between spoken article sections.',
				TEXT_DOMAIN
			)}
			textDomain={TEXT_DOMAIN}
			idPrefix="prc-spoken-article-interstitial-settings"
			store={store}
			saveSettings={saveInterstitials}
			errorRetryLabel={__(
				'Please try again. If the problem persists, contact support.',
				TEXT_DOMAIN
			)}
			sections={[
				{
					slug: 'general-settings',
					title: __('General Settings', TEXT_DOMAIN),
					description: __(
						'Configure the player display label shown when an interstitial plays.',
						TEXT_DOMAIN
					),
					fields: GENERAL_SETTINGS_FIELDS,
				},
				{
					slug: 'interstitial-ads',
					title: __('Interstitial Ads', TEXT_DOMAIN),
					description: __(
						'Manage audio ads that play between spoken article sections. Active ads are selected by weighted random.',
						TEXT_DOMAIN
					),
					render: () => <InterstitialAdsSection />,
				},
			]}
			onLoad={fetchInterstitials}
		/>
	);
}
