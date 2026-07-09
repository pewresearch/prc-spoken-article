export interface InterstitialAd {
	id: string;
	label: string;
	text: string;
	textIsDraft: boolean;
	audioUrl: string;
	attachmentId: number;
	duration: string;
	voiceId: string;
	weight: number;
	isActive: boolean;
}

export interface InterstitialSettings {
	ads: InterstitialAd[];
	label: string;
}

export interface InterstitialStoreState {
	settings: InterstitialSettings;
	isLoaded: boolean;
}

export interface ApiResponse {
	ads: InterstitialAd[];
	label: string;
}
