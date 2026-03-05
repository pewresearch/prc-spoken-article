/**
 * WordPress Dependencies
 */
import { registerPlugin } from '@wordpress/plugins';
import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal Dependencies
 */
import SidebarPanel from './sidebar-panel';
import { createGenerateSpokenArticleCallback } from './generate-spoken-article-callback';

const PLUGIN_NAME = 'prc-spoken-article';
const ABILITY_NAME = 'prc-spoken-article/generate';

function SpokenArticleSidebar() {
	return (
		<>
			<PluginSidebarMoreMenuItem
				target={PLUGIN_NAME}
				icon={
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width="24"
						height="24"
					>
						<path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
					</svg>
				}
			>
				{__('Spoken Article', 'prc-spoken-article')}
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name={PLUGIN_NAME}
				title={__('Spoken Article', 'prc-spoken-article')}
				icon={
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width="24"
						height="24"
					>
						<path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
					</svg>
				}
			>
				<SidebarPanel />
			</PluginSidebar>
		</>
	);
}

registerPlugin(PLUGIN_NAME, {
	render: SpokenArticleSidebar,
});

const config = (window as any).PRCSpokenArticleAI;
if (config) {
	void import(/* webpackIgnore: true */ '@wordpress/abilities').then(
		({ registerAbility }) =>
			registerAbility({
				name: ABILITY_NAME,
				label: __('Generate Spoken Article', 'prc-spoken-article'),
				description: __(
					'Generate AI-narrated audio from post content using ElevenLabs.',
					'prc-spoken-article'
				),
				category: 'media-generation',
				input_schema: {
					type: 'object',
					properties: {
						post_id: {
							type: 'number',
							description: 'The post ID to generate audio for.',
						},
					},
					required: ['post_id'],
					additionalProperties: false,
				},
				output_schema: {
					type: 'object',
					properties: {
						error: {
							type: 'string',
							description: 'An error message, if any.',
						},
						audio_id: {
							type: 'number',
							description: 'The media library attachment ID.',
						},
						audio_url: {
							type: 'string',
							description: 'The audio file URL.',
						},
						duration: {
							type: 'string',
							description:
								'Human-readable duration (e.g., "2:30").',
						},
					},
				},
				callback: createGenerateSpokenArticleCallback(config),
				permissionCallback: async () => {
					return true;
				},
			})
	);
}
