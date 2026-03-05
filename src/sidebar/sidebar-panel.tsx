/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';
import { PanelBody, PanelRow, Button, Notice } from '@wordpress/components';

/**
 * Internal Dependencies
 */
import AIGenerateSpokenArticle from './ai-generate-spoken-article';
import VoicePicker from './voice-picker';

declare global {
	interface Window {
		PRCSpokenArticleAI?: {
			enabled: boolean;
			elevenlabs: {
				apiKey: string;
				voiceId: string;
				model: string;
				stability: number;
				similarityBoost: number;
			};
			restBase: string;
			mediaUrl: string;
			restNonce: string;
		};
	}
}

interface SpokenArticleMeta {
	attachment_id: number;
	audio_url: string;
	duration: string;
}

export default function SidebarPanel() {
	const { postType, postId } = useSelect((select) => {
		const editor = select(editorStore) as {
			getCurrentPostType: () => string;
			getCurrentPostId: () => number;
		};
		return {
			postType: editor.getCurrentPostType(),
			postId: editor.getCurrentPostId(),
		};
	}, []);

	const [meta, setMeta] = useEntityProp('postType', postType, 'meta');

	const spokenArticle: SpokenArticleMeta = meta?.spoken_article ?? {
		attachment_id: 0,
		audio_url: '',
		duration: '',
	};
	const playCount: number = meta?.spoken_article_play_count ?? 0;
	const hasAudio = spokenArticle.attachment_id && spokenArticle.audio_url;

	const handleSetSpokenArticle = (data: SpokenArticleMeta) => {
		setMeta({ ...meta, spoken_article: data });
	};

	const handleRemoveAudio = () => {
		setMeta({
			...meta,
			spoken_article: {
				attachment_id: 0,
				audio_url: '',
				duration: '',
			},
		});
	};

	return (
		<>
			<PanelBody
				title={__('Audio Status', 'prc-spoken-article')}
				initialOpen={true}
			>
				{hasAudio ? (
					<>
						<PanelRow>
							<div style={{ width: '100%' }}>
								<p
									style={{
										margin: '0 0 4px',
										fontWeight: 600,
									}}
								>
									{__('Duration:', 'prc-spoken-article')}{' '}
									{spokenArticle.duration ||
										__('Unknown', 'prc-spoken-article')}
								</p>
								<audio
									controls
									preload="metadata"
									src={spokenArticle.audio_url}
									style={{ width: '100%', marginTop: 8 }}
								/>
							</div>
						</PanelRow>
						<PanelRow>
							<Button
								variant="secondary"
								isDestructive
								onClick={handleRemoveAudio}
								size="small"
							>
								{__('Remove Audio', 'prc-spoken-article')}
							</Button>
						</PanelRow>
					</>
				) : (
					<PanelRow>
						<Notice status="info" isDismissible={false}>
							{__(
								'No spoken article audio has been generated for this post.',
								'prc-spoken-article'
							)}
						</Notice>
					</PanelRow>
				)}
			</PanelBody>

			<PanelBody
				title={__('Play Count', 'prc-spoken-article')}
				initialOpen={true}
			>
				<PanelRow>
					<span>{__('Total plays:', 'prc-spoken-article')}</span>
					<strong>{playCount.toLocaleString()}</strong>
				</PanelRow>
			</PanelBody>

			<PanelBody
				title={__('Voice', 'prc-spoken-article')}
				initialOpen={false}
			>
				<VoicePicker />
			</PanelBody>

			<PanelBody
				title={__('AI Generation', 'prc-spoken-article')}
				initialOpen={!hasAudio}
			>
				<AIGenerateSpokenArticle
					spokenArticle={spokenArticle}
					setSpokenArticle={handleSetSpokenArticle}
				/>
			</PanelBody>
		</>
	);
}
