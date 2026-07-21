import { createSettingsStore } from '@prc/components';
import {
	DEFAULT_DRAFT_ELEVENLABS_MODEL,
	DEFAULT_ELEVENLABS_MODEL,
} from '../shared/elevenlabs-models';
import type {
	InterstitialAd,
	InterstitialSettings,
	InterstitialStoreState,
	ApiResponse,
} from './types';

export const STORE_NAME = 'prc/spoken-article-interstitials';

export const store = createSettingsStore<
	InterstitialSettings,
	InterstitialStoreState,
	ApiResponse
>({
	name: STORE_NAME,
	defaultState: {
		settings: {
			ads: [],
			label: 'A message from Pew Research Center',
			elevenlabs_model: DEFAULT_ELEVENLABS_MODEL,
			elevenlabs_draft_model: DEFAULT_DRAFT_ELEVENLABS_MODEL,
			elevenlabs_api_key: '',
			elevenlabs_connected: false,
			api_key_via_constant: false,
		},
		isLoaded: false,
	},
	getSettingsFromResponse: (response) => ({
		ads: response.ads,
		label: response.label,
		elevenlabs_model: response.elevenlabs_model,
		elevenlabs_draft_model: response.elevenlabs_draft_model,
		elevenlabs_api_key: response.elevenlabs_api_key,
		elevenlabs_connected: response.elevenlabs_connected,
		api_key_via_constant: response.api_key_via_constant,
	}),
	extraActions: {
		addAd(ad: InterstitialAd) {
			return { type: 'ADD_AD', ad };
		},
		updateAd(id: string, updates: Partial<InterstitialAd>) {
			return { type: 'UPDATE_AD', id, updates };
		},
		deleteAd(id: string) {
			return { type: 'DELETE_AD', id };
		},
	},
	extraReducer: (state, action) => {
		switch (action.type) {
			case 'ADD_AD':
				return {
					...state,
					settings: {
						...state.settings,
						ads: [
							...state.settings.ads,
							action.ad as InterstitialAd,
						],
					},
				};
			case 'UPDATE_AD':
				return {
					...state,
					settings: {
						...state.settings,
						ads: state.settings.ads.map((ad) =>
							ad.id === action.id
								? {
										...ad,
										...(action.updates as Partial<InterstitialAd>),
									}
								: ad
						),
					},
				};
			case 'DELETE_AD':
				return {
					...state,
					settings: {
						...state.settings,
						ads: state.settings.ads.filter(
							(ad) => ad.id !== action.id
						),
					},
				};
			default:
				return null;
		}
	},
	extraSelectors: {
		getAds(state: InterstitialStoreState): InterstitialAd[] {
			return state.settings.ads;
		},
	},
});
