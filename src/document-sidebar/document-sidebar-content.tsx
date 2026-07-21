/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';
import {
	PanelRow,
	Button,
	Notice,
	ExternalLink,
	__experimentalText as Text,
} from '@wordpress/components';

/**
 * Internal Dependencies
 */
import AIGenerateSpokenArticle from './ai-generate-spoken-article';
import InterstitialPanel from './interstitial-panel';
import VoiceSettingsPanel from './voice-settings-panel';
import { getAudioQualityLabel } from '../shared/audio-quality';
import {
	useSpokenArticleGeneratingLock,
	emptyGeneratingLock,
	getEditedPostMeta,
} from './use-spoken-article-generating-lock';

interface SpokenArticleMeta {
	attachment_id: number;
	audio_url: string;
	duration: string;
}

export default function DocumentSidebarContent({
	section,
}: {
	section: string;
}) {
	const { postType, postParent } = useSelect((select) => {
		const editor = select(editorStore) as {
			getCurrentPostType: () => string;
			getEditedPostAttribute: (attr: string) => unknown;
		};
		return {
			postType: editor.getCurrentPostType(),
			postParent:
				(editor.getEditedPostAttribute('post_parent') as number) ?? 0,
		};
	}, []);

	const [meta, setMeta] = useEntityProp('postType', postType, 'meta');

	const parentTitle = useSelect(
		(select) => {
			if (!postParent) {
				return '';
			}
			const coreSelect = select('core') as {
				getEntityRecords: (
					kind: string,
					name: string,
					query: Record<string, unknown>
				) => Array<{ title?: { rendered?: string } }> | null;
			};
			const records = coreSelect.getEntityRecords('postType', 'post', {
				include: [postParent],
				per_page: 1,
				_fields: 'id,title',
			});
			return records?.[0]?.title?.rendered ?? '';
		},
		[postParent]
	);

	const parentEditUrl = postParent
		? `${window?.prcPlatform?.siteUrl}/wp-admin/post.php?post=${postParent}&action=edit`
		: '';

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
	const audioQuality: string = meta?.spoken_article_audio_quality ?? '';
	const playCount: number = meta?.spoken_article_play_count ?? 0;
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
			spoken_article_audio_quality: '',
		});
	};

	const handleSetTranscript = (
		_text: string,
		isDraft: boolean,
		atMinutes?: number
	) => {
		setMeta({
			...meta,
			spoken_article_transcript_is_draft: isDraft,
			...(atMinutes !== undefined
				? { spoken_article_target_minutes: atMinutes }
				: {}),
		});
	};

	const handleAudioGenerated = (
		data: SpokenArticleMeta,
		_transcriptText: string,
		quality: 'draft' | 'production'
	) => {
		const currentMeta = getEditedPostMeta();
		setMeta({
			...currentMeta,
			spoken_article: data,
			spoken_article_audio_quality: quality,
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

	if (section === 'parent-link') {
		return (
			<>
				{postParent ? (
					<PanelRow>
						<ExternalLink href={parentEditUrl}>
							{parentTitle ||
								__('Parent Post', 'prc-spoken-article')}
						</ExternalLink>
					</PanelRow>
				) : (
					<PanelRow>
						<Notice status="warning" isDismissible={false}>
							{__('No parent post linked.', 'prc-spoken-article')}
						</Notice>
					</PanelRow>
				)}
			</>
		);
	}

	if (section === 'audio-status') {
		return (
			<>
				{hasAudio ? (
					<>
						<PanelRow>
							<Text weight={600}>
								{getAudioQualityLabel(audioQuality)}
							</Text>
						</PanelRow>
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
							<span>
								{__('Total plays:', 'prc-spoken-article')}
							</span>
							<strong>{playCount.toLocaleString()}</strong>
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
								'No spoken article audio has been generated yet.',
								'prc-spoken-article'
							)}
						</Notice>
					</PanelRow>
				)}
			</>
		);
	}

	if (section === 'voice') {
		return (
			<VoiceSettingsPanel
				voiceId={voiceId}
				onVoiceChange={handleVoiceChange}
			/>
		);
	}

	if (section === 'generation') {
		return (
			<AIGenerateSpokenArticle
				spokenArticle={spokenArticle}
				setTranscript={handleSetTranscript}
				onAudioGenerated={handleAudioGenerated}
				voiceId={voiceId}
				targetMinutes={targetMinutes}
				setTargetMinutes={setTargetMinutes}
				isRemoteLocked={isRemoteLocked}
				remoteUserName={remoteUserName}
				setGeneratingLock={setGeneratingLock}
				parentPostId={postParent}
			/>
		);
	}

	if (section === 'interstitial') {
		return (
			<InterstitialPanel
				interstitial={interstitial}
				interstitialEnabled={interstitialEnabled}
				onUpdateInterstitial={handleUpdateInterstitial}
				onSetEnabled={handleSetInterstitialEnabled}
				isRemoteLocked={isRemoteLocked}
				remoteUserName={remoteUserName}
				setGeneratingLock={setGeneratingLock}
			/>
		);
	}

	return null;
}
