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
	elevenlabs_model: string;
	elevenlabs_draft_model: string;
	elevenlabs_api_key: string;
	elevenlabs_connected: boolean;
	api_key_via_constant: boolean;
}

export interface InterstitialStoreState {
	settings: InterstitialSettings;
	isLoaded: boolean;
}

export interface ApiResponse {
	ads: InterstitialAd[];
	label: string;
	elevenlabs_model: string;
	elevenlabs_draft_model: string;
	elevenlabs_api_key: string;
	elevenlabs_connected: boolean;
	api_key_via_constant: boolean;
}
