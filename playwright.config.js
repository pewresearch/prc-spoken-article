import { defineConfig } from '@playwright/test';
import baseConfig from '@wordpress/scripts/config/playwright.config';

export default defineConfig({
	...baseConfig,
	testDir: './tests',
	outputDir: './tests/artifacts/results',
	use: {
		...baseConfig.use,
		video: 'on',
		trace: 'on',
	},
	reporter: [
		...baseConfig.reporter,
		['html', { outputFolder: './tests/artifacts/reports' }],
	],
});
