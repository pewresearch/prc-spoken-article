import { createReduxStore, register } from '@wordpress/data';
import type {
	InterstitialAd,
	InterstitialSettings,
	InterstitialStoreState,
	ApiResponse,
} from './types';

export const STORE_NAME = 'prc/spoken-article-interstitials';

const DEFAULT_SETTINGS: InterstitialSettings = {
	ads: [],
	label: 'A message from Pew Research Center',
};

const DEFAULT_STATE: InterstitialStoreState = {
	settings: DEFAULT_SETTINGS,
	isLoaded: false,
};

const actions = {
	setFromResponse(response: ApiResponse) {
		return {
			type: 'SET_FROM_RESPONSE' as const,
			response,
		};
	},
	updateLabel(label: string) {
		return {
			type: 'UPDATE_LABEL' as const,
			label,
		};
	},
	addAd(ad: InterstitialAd) {
		return {
			type: 'ADD_AD' as const,
			ad,
		};
	},
	updateAd(id: string, updates: Partial<InterstitialAd>) {
		return {
			type: 'UPDATE_AD' as const,
			id,
			updates,
		};
	},
	deleteAd(id: string) {
		return {
			type: 'DELETE_AD' as const,
			id,
		};
	},
};

type Action = ReturnType<(typeof actions)[keyof typeof actions]>;

function reducer(
	state: InterstitialStoreState = DEFAULT_STATE,
	action: Action
): InterstitialStoreState {
	switch (action.type) {
		case 'SET_FROM_RESPONSE':
			return {
				...state,
				settings: {
					ads: action.response.ads,
					label: action.response.label,
				},
				isLoaded: true,
			};
		case 'UPDATE_LABEL':
			return {
				...state,
				settings: {
					...state.settings,
					label: action.label,
				},
			};
		case 'ADD_AD':
			return {
				...state,
				settings: {
					...state.settings,
					ads: [...state.settings.ads, action.ad],
				},
			};
		case 'UPDATE_AD':
			return {
				...state,
				settings: {
					...state.settings,
					ads: state.settings.ads.map((ad) =>
						ad.id === action.id ? { ...ad, ...action.updates } : ad
					),
				},
			};
		case 'DELETE_AD':
			return {
				...state,
				settings: {
					...state.settings,
					ads: state.settings.ads.filter((ad) => ad.id !== action.id),
				},
			};
		default:
			return state;
	}
}

const selectors = {
	getSettings(state: InterstitialStoreState): InterstitialSettings {
		return state.settings;
	},
	getAds(state: InterstitialStoreState): InterstitialAd[] {
		return state.settings.ads;
	},
	getLabel(state: InterstitialStoreState): string {
		return state.settings.label;
	},
	isLoaded(state: InterstitialStoreState): boolean {
		return state.isLoaded;
	},
};

export const store = createReduxStore(STORE_NAME, {
	reducer,
	actions,
	selectors,
});

register(store);
