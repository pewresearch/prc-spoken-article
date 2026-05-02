/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';
import { PanelBody, PanelRow, Button, Notice } from '@wordpress/components';

/**
 * Internal Dependencies
 */
import AIGenerateSpokenArticle from './ai-generate-spoken-article';
import InterstitialPanel from './interstitial-panel';
import VoicePicker from './voice-picker';
import {
	useSpokenArticleGeneratingLock,
	emptyGeneratingLock,
	getEditedPostMeta,
} from './use-spoken-article-generating-lock';
import SpokenArticleTranscriptPanel from './spoken-article-transcript-panel';

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
	// Initialize from meta so the value persists across sidebar mounts/reloads.
	// storedTargetMinutes tracks what target length the saved transcript was generated at.
	const storedTargetMinutes: number =
		meta?.spoken_article_target_minutes ?? 4;
	const [targetMinutes, setTargetMinutes] = useState<number>(
		() => meta?.spoken_article_target_minutes ?? 4
	);

	const { isRemoteLocked, remoteUserName, setGeneratingLock } =
		useSpokenArticleGeneratingLock(meta, setMeta);

	const spokenArticle: SpokenArticleMeta = meta?.spoken_article ?? {
		attachment_id: 0,
		audio_url: '',
		duration: '',
	};
	const voiceId: string =
		meta?.spoken_article_voice_id ||
		window.PRCSpokenArticleAI?.elevenlabs?.voiceId ||
		'';
	const playCount: number = meta?.spoken_article_play_count ?? 0;
	const transcript: string = meta?.spoken_article_transcript ?? '';
	const transcriptIsDraft: boolean =
		meta?.spoken_article_transcript_is_draft ?? false;
	const interstitial = meta?.spoken_article_interstitial ?? {
		text: '',
		textIsDraft: false,
		audioUrl: '',
		attachmentId: 0,
		duration: '',
		voiceId: '',
	};
	const interstitialEnabled: boolean =
		meta?.spoken_article_interstitial_enabled ?? false;
	const hasAudio = !!spokenArticle.attachment_id && !!spokenArticle.audio_url;

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

	const handleSetTranscript = (
		text: string,
		isDraft: boolean,
		atMinutes?: number
	) => {
		setMeta({
			...meta,
			spoken_article_transcript: text,
			spoken_article_transcript_is_draft: isDraft,
			...(atMinutes !== undefined
				? { spoken_article_target_minutes: atMinutes }
				: {}),
		});
	};

	// Single setMeta from fresh store meta so spoken_article, transcript, and
	// generating-lock clear survive the following setGeneratingLock(false) in finally.
	const handleAudioGenerated = (
		data: SpokenArticleMeta,
		transcriptText: string
	) => {
		const currentMeta = getEditedPostMeta();
		setMeta({
			...currentMeta,
			spoken_article: data,
			spoken_article_transcript: transcriptText,
			spoken_article_transcript_is_draft: false,
			spoken_article_generating: emptyGeneratingLock(),
		});
	};

	const handleUpdateInterstitial = (updates: Record<string, unknown>) => {
		setMeta({
			...meta,
			spoken_article_interstitial: { ...interstitial, ...updates },
		});
	};

	const handleSetInterstitialEnabled = (enabled: boolean) => {
		setMeta({ ...meta, spoken_article_interstitial_enabled: enabled });
	};

	const handleVoiceChange = (newVoiceId: string) => {
		setMeta({ ...meta, spoken_article_voice_id: newVoiceId });
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
				<VoicePicker
					selectedId={voiceId}
					onSelect={handleVoiceChange}
				/>
			</PanelBody>

			{!!transcript && (
				<SpokenArticleTranscriptPanel
					transcript={transcript}
					transcriptIsDraft={transcriptIsDraft}
					onTranscriptChange={handleTranscriptChange}
				/>
			)}

			<PanelBody
				title={__('AI Generation', 'prc-spoken-article')}
				initialOpen={!hasAudio}
			>
				<AIGenerateSpokenArticle
					spokenArticle={spokenArticle}
					transcript={transcript}
					transcriptIsDraft={transcriptIsDraft}
					setTranscript={handleSetTranscript}
					onAudioGenerated={handleAudioGenerated}
					voiceId={voiceId}
					targetMinutes={targetMinutes}
					setTargetMinutes={setTargetMinutes}
					transcriptTargetMinutes={storedTargetMinutes}
					isRemoteLocked={isRemoteLocked}
					remoteUserName={remoteUserName}
					setGeneratingLock={setGeneratingLock}
				/>
			</PanelBody>

			<InterstitialPanel
				interstitial={interstitial}
				interstitialEnabled={interstitialEnabled}
				onUpdateInterstitial={handleUpdateInterstitial}
				onSetEnabled={handleSetInterstitialEnabled}
				isRemoteLocked={isRemoteLocked}
				remoteUserName={remoteUserName}
				setGeneratingLock={setGeneratingLock}
			/>
		</>
	);
}
