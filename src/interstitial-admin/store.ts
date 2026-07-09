import { createSettingsStore } from '@prc/components';
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
		},
		isLoaded: false,
	},
	getSettingsFromResponse: (response) => ({
		ads: response.ads,
		label: response.label,
	}),
	extraActions: {
		updateLabel(label: string) {
			return { type: 'UPDATE_LABEL', label };
		},
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
			case 'UPDATE_LABEL':
				return {
					...state,
					settings: {
						...state.settings,
						label: action.label as string,
					},
				};
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
		getLabel(state: InterstitialStoreState): string {
			return state.settings.label;
		},
	},
});
