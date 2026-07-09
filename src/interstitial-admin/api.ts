import { __ } from '@wordpress/i18n';
import { createSettingsClient } from '@prc/components';

import { store } from './store';

const { fetchSettings, saveSettings } = createSettingsClient({
	restPath: '/prc-spoken-article/v1/interstitial-ads',
	store,
	successMessage: __('Interstitial settings saved.', 'prc-spoken-article'),
});

export const fetchInterstitials = fetchSettings;
export const saveInterstitials = saveSettings;
