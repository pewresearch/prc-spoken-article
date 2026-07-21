/**
 * WordPress Dependencies
 */
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { useCommand } from '@wordpress/commands';
import { useEntityProp } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';

/**
 * Internal Dependencies
 */
import DocumentSidebarContent from './document-sidebar-content';
import AudioGeneratingModal from './audio-generating-modal';
import SpokenArticlePrePublishPanel from './pre-publish-panel';
import { createGenerateSpokenArticleCallback } from './generate-spoken-article-callback';
import {
	isGeneratingLockStale,
	type GeneratingLockMeta,
} from './use-spoken-article-generating-lock';

const PLUGIN_NAME = 'prc-spoken-article-settings';
const ABILITY_NAME = 'prc-spoken-article/generate';

const headphonesIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		width="24"
		height="24"
	>
		<path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
	</svg>
);

function SpokenArticleDocumentSidebar() {
	const { postType } = useSelect((select) => {
		const editor = select(editorStore) as {
			getCurrentPostType: () => string;
		};
		return {
			postType: editor.getCurrentPostType(),
		};
	}, []);

	useCommand({
		name: 'prc/generate-spoken-article',
		label: __('Generate Spoken Article Audio', 'prc-spoken-article'),
		icon: headphonesIcon,
		category: 'action',
		keywords: ['audio', 'spoken', 'article', 'tts', 'voice', 'generate'],
		callback: ({ close }) => {
			(window as any).__prcSpokenArticleStartGenerate = true;
			window.dispatchEvent(
				new CustomEvent('prc-spoken-article:start-generate')
			);
			close();
		},
	});

	if (postType !== 'spoken-article') {
		return null;
	}

	return (
		<>
			<GeneratingLockModal />
			<SpokenArticlePrePublishPanel />
			<PluginDocumentSettingPanel
				name="prc-spoken-article-parent-link"
				title={__('Parent Post', 'prc-spoken-article')}
			>
				<DocumentSidebarContent section="parent-link" />
			</PluginDocumentSettingPanel>
			<PluginDocumentSettingPanel
				name="prc-spoken-article-audio"
				title={__('Audio Status', 'prc-spoken-article')}
			>
				<DocumentSidebarContent section="audio-status" />
			</PluginDocumentSettingPanel>
			<PluginDocumentSettingPanel
				name="prc-spoken-article-voice"
				title={__('Voice', 'prc-spoken-article')}
			>
				<DocumentSidebarContent section="voice" />
			</PluginDocumentSettingPanel>
			<PluginDocumentSettingPanel
				name="prc-spoken-article-generation"
				title={__('AI Generation', 'prc-spoken-article')}
			>
				<DocumentSidebarContent section="generation" />
			</PluginDocumentSettingPanel>
			<PluginDocumentSettingPanel
				name="prc-spoken-article-interstitial"
				title={__('Interstitial Ad', 'prc-spoken-article')}
			>
				<DocumentSidebarContent section="interstitial" />
			</PluginDocumentSettingPanel>
		</>
	);
}

const DEFAULT_LOCK: GeneratingLockMeta = {
	active: false,
	userId: 0,
	userName: '',
	startedAt: '',
};

function GeneratingLockModal() {
	const [meta] = useEntityProp('postType', 'spoken-article', 'meta');
	const generatingMeta: GeneratingLockMeta =
		meta?.spoken_article_generating ?? DEFAULT_LOCK;

	const isActive =
		generatingMeta.active &&
		!isGeneratingLockStale(generatingMeta.startedAt);

	if (!isActive) {
		return null;
	}

	const currentUserId =
		(
			window as {
				PRCSpokenArticleConfig?: { userId?: number };
			}
		).PRCSpokenArticleConfig?.userId ?? 0;

	const isCurrentUser =
		currentUserId !== 0 && generatingMeta.userId === currentUserId;

	return (
		<AudioGeneratingModal
			userName={generatingMeta.userName}
			startedAt={generatingMeta.startedAt}
			isCurrentUser={isCurrentUser}
		/>
	);
}

registerPlugin(PLUGIN_NAME, {
	render: SpokenArticleDocumentSidebar,
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
