/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';
import {
	PanelBody,
	PanelRow,
	Button,
	Notice,
	TextareaControl,
	__experimentalText as Text,
} from '@wordpress/components';

/**
 * Internal Dependencies
 */
import AIGenerateSpokenArticle from './ai-generate-spoken-article';
import VoicePicker from './voice-picker';

interface SpokenArticleMeta {
	attachment_id: number;
	audio_url: string;
	duration: string;
}

export default function SidebarPanel() {
	const { postType } = useSelect((select) => {
		const editor = select(editorStore) as {
			getCurrentPostType: () => string;
			getCurrentPostId: () => number;
		};
		return {
			postType: editor.getCurrentPostType(),
		};
	}, []);

	const [meta, setMeta] = useEntityProp('postType', postType, 'meta');

	const spokenArticle: SpokenArticleMeta = meta?.spoken_article ?? {
		attachment_id: 0,
		audio_url: '',
		duration: '',
	};
	const playCount: number = meta?.spoken_article_play_count ?? 0;
	const transcript: string = meta?.spoken_article_transcript ?? '';
	const transcriptIsDraft: boolean =
		meta?.spoken_article_transcript_is_draft ?? false;
	const hasAudio = !!spokenArticle.attachment_id && !!spokenArticle.audio_url;

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

	const handleSetTranscript = (text: string, isDraft: boolean) => {
		setMeta({
			...meta,
			spoken_article_transcript: text,
			spoken_article_transcript_is_draft: isDraft,
		});
	};

	// Single setMeta call for audio generation so the spoken_article and
	// transcript fields are never overwritten by a stale-meta race.
	const handleAudioGenerated = (
		data: SpokenArticleMeta,
		transcriptText: string
	) => {
		setMeta({
			...meta,
			spoken_article: data,
			spoken_article_transcript: transcriptText,
			spoken_article_transcript_is_draft: false,
		});
	};

	const handleTranscriptChange = (value: string) => {
		setMeta({ ...meta, spoken_article_transcript: value });
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

			{!!transcript && (
				<PanelBody
					title={__('Transcript', 'prc-spoken-article')}
					initialOpen={transcriptIsDraft}
				>
					<PanelRow>
						<div style={{ width: '100%' }}>
							{transcriptIsDraft ? (
								<div style={{ marginBottom: '8px' }}>
									<Notice
										status="warning"
										isDismissible={false}
									>
										{__(
											'Draft transcript — edit below, then generate audio when ready.',
											'prc-spoken-article'
										)}
									</Notice>
								</div>
							) : (
								<div style={{ marginBottom: '8px' }}>
									<Notice
										status="success"
										isDismissible={false}
									>
										{__(
											'Transcript used for the current audio. Regenerate to create a new draft.',
											'prc-spoken-article'
										)}
									</Notice>
								</div>
							)}
							<Text
								variant="muted"
								style={{
									display: 'block',
									marginBottom: '4px',
								}}
							>
								{__('Characters:', 'prc-spoken-article')}{' '}
								{transcript.length.toLocaleString()}
							</Text>
							<TextareaControl
								__nextHasNoMarginBottom
								label={__('Transcript', 'prc-spoken-article')}
								hideLabelFromVision
								value={transcript}
								onChange={handleTranscriptChange}
								rows={12}
								disabled={!transcriptIsDraft}
								style={{ width: '100%' }}
							/>
						</div>
					</PanelRow>
				</PanelBody>
			)}

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
					transcript={transcript}
					transcriptIsDraft={transcriptIsDraft}
					setTranscript={handleSetTranscript}
					onAudioGenerated={handleAudioGenerated}
				/>
			</PanelBody>
		</>
	);
}
