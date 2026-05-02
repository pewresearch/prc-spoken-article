import { createRoot } from '@wordpress/element';

import type { PRCSpokenArticleConfig } from '../shared/types';
import InterstitialAdminApp from './app';

declare global {
	interface Window {
		PRCSpokenArticleConfig: { restBase: string; restNonce: string };
		PRCSpokenArticleAI: PRCSpokenArticleConfig;
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById(
		'prc-spoken-article-interstitial-admin'
	);
	if (container) {
		const root = createRoot(container);
		root.render(<InterstitialAdminApp />);
	}
});
