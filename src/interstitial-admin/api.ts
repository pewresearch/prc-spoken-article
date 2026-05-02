import apiFetch from '@wordpress/api-fetch';
import { dispatch, select } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';

import { store as interstitialsStore } from './store';
import type { ApiResponse } from './types';

const REST_PATH = '/prc-spoken-article/v1/interstitial-ads';

export async function fetchInterstitials(): Promise<ApiResponse> {
	const { setFromResponse } = dispatch(interstitialsStore);

	const response = (await apiFetch({ path: REST_PATH })) as ApiResponse;
	setFromResponse(response);

	return response;
}

export async function saveInterstitials(): Promise<ApiResponse> {
	const { setFromResponse } = dispatch(interstitialsStore);
	const { createSuccessNotice } = dispatch(noticesStore);

	const settings = select(interstitialsStore).getSettings();

	const response = (await apiFetch({
		path: REST_PATH,
		method: 'POST',
		data: settings,
	})) as ApiResponse;

	setFromResponse(response);

	createSuccessNotice(
		__('Interstitial settings saved.', 'prc-spoken-article'),
		{ type: 'snackbar' }
	);

	return response;
}
