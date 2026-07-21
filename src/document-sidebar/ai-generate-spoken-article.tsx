/**
 * External Dependencies
 */
import { AISuggestButton } from '@prc/components';

/**
 * WordPress Dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useState, useCallback, useRef, useEffect } from '@wordpress/element';
import {
	Notice,
	Spinner,
	RangeControl,
	Button,
	__experimentalVStack as VStack,
	__experimentalText as Text,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';
import { store as editorStore } from '@wordpress/editor';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';

/**
 * Internal Dependencies
 */
import {
	fetchTtsText,
	generateAudioFromText,
	type PRCSpokenArticleConfig,
} from './generate-spoken-article-callback';
import {
	type AudioQualityTier,
	getModelForQualityTier,
	getModelLabelForQualityTier,
} from '../shared/audio-quality';

interface SpokenArticleMeta {
	attachment_id: number;
	audio_url: string;
	duration: string;
}

declare global {
	interface Window {
		PRCSpokenArticleAI: PRCSpokenArticleConfig;
	}
}

export const GENERATE_PRODUCTION_AUDIO_EVENT =
	'prc-spoken-article:generate-production-audio';

/**
 * Split plain text into paragraph blocks.
 * Splits on double newlines; single newlines within a chunk become separate paragraphs too.
 */
function textToParagraphBlocks(text: string) {
	const chunks = text
		.split(/\n{2,}/)
		.map((s) => s.trim())
		.filter(Boolean);

	return chunks.map((chunk) =>
		createBlock('core/paragraph', { content: chunk })
	);
}

export default function AIGenerateSpokenArticle({
	spokenArticle,
	setTranscript,
	onAudioGenerated,
	voiceId,
	targetMinutes,
	setTargetMinutes,
	isRemoteLocked,
	remoteUserName,
	setGeneratingLock,
	parentPostId,
}: {
	spokenArticle: SpokenArticleMeta;
	setTranscript: (text: string, isDraft: boolean, atMinutes?: number) => void;
	onAudioGenerated: (
		data: SpokenArticleMeta,
		transcriptText: string,
		quality: AudioQualityTier
	) => void;
	voiceId: string;
	targetMinutes: number;
	setTargetMinutes: (val: number) => void;
	isRemoteLocked: boolean;
	remoteUserName: string;
	setGeneratingLock: (active: boolean) => void;
	parentPostId: number;
}) {
	const [isFetchingText, setIsFetchingText] = useState(false);
	const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
	const [audioQualityTier, setAudioQualityTier] =
		useState<AudioQualityTier>('draft');
	const busyRef = useRef(false);

	const postId = useSelect(
		(select: {
			(key: string): { getCurrentPostId: () => number | undefined };
		}) => select('core/editor').getCurrentPostId(),
		[]
	);

	const postContent = useSelect(
		(select) =>
			(
				select(editorStore) as {
					getEditedPostContent: () => string;
				}
			).getEditedPostContent(),
		[]
	);

	const { resetBlocks } = useDispatch(blockEditorStore);

	const { lockPostSaving, unlockPostSaving } = useDispatch(editorStore);

	const { createSuccessNotice, createErrorNotice } =
		useDispatch(noticesStore);

	const getConfig = useCallback((): PRCSpokenArticleConfig | null => {
		const config = window.PRCSpokenArticleAI;
		if (!config?.elevenlabs?.connected) {
			createErrorNotice(
				__(
					'ElevenLabs API key is not configured.',
					'prc-spoken-article'
				),
				{ type: 'snackbar', isDismissible: true }
			);
			return null;
		}
		return config;
	}, [createErrorNotice]);

	const sourcePostId = parentPostId || postId || 0;

	const handleGenerateTranscript = useCallback(async () => {
		if (!sourcePostId || busyRef.current) {
			return;
		}

		const config = getConfig();
		if (!config) {
			return;
		}

		busyRef.current = true;
		setIsFetchingText(true);

		try {
			const result = await fetchTtsText(
				config,
				sourcePostId,
				targetMinutes
			);
			if (!result.text || result.text.length < 10) {
				createErrorNotice(
					__(
						'Not enough text content to generate a transcript.',
						'prc-spoken-article'
					),
					{ type: 'snackbar', isDismissible: true }
				);
				return;
			}

			const blocks = textToParagraphBlocks(result.text);
			resetBlocks(blocks);
			setTranscript(
				result.text,
				result.wasSummarized !== false,
				targetMinutes
			);

			if (result.wasSummarized === false) {
				createErrorNotice(
					__(
						'AI summarization is unavailable, so the parent post text was inserted as-is. Edit before generating audio. Check the server error log for details.',
						'prc-spoken-article'
					),
					{ type: 'snackbar', isDismissible: true }
				);
			} else {
				createSuccessNotice(
					__(
						'AI transcript inserted into the editor. Review and edit before generating audio.',
						'prc-spoken-article'
					),
					{ type: 'snackbar', isDismissible: true }
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			createErrorNotice(message, {
				type: 'snackbar',
				isDismissible: true,
			});
		} finally {
			setIsFetchingText(false);
			busyRef.current = false;
		}
	}, [
		sourcePostId,
		targetMinutes,
		getConfig,
		resetBlocks,
		setTranscript,
		createSuccessNotice,
		createErrorNotice,
	]);

	const handleGenerateAudio = useCallback(
		async (qualityTier: AudioQualityTier = audioQualityTier) => {
			if (!postId || busyRef.current) {
				return;
			}

			const text = postContent?.trim();
			if (!text || text.length < 10) {
				createErrorNotice(
					__(
						'The transcript body is too short to generate audio.',
						'prc-spoken-article'
					),
					{ type: 'snackbar', isDismissible: true }
				);
				return;
			}

			const config = getConfig();
			if (!config) {
				return;
			}

			setGeneratingLock(true);
			lockPostSaving('spoken-article-generating');
			busyRef.current = true;
			setIsGeneratingAudio(true);

			let clearLockInFinally = true;
			const model = getModelForQualityTier(qualityTier);

			try {
				const plainText = text.replace(/<[^>]+>/g, '').trim();

				const configWithOverrides = {
					...config,
					elevenlabs: {
						...config.elevenlabs,
						...(voiceId ? { voiceId } : {}),
						model,
					},
				};
				const result = await generateAudioFromText(
					configWithOverrides,
					postId,
					plainText
				);

				if (result.error && result.error.length > 0) {
					createErrorNotice(result.error, {
						type: 'snackbar',
						isDismissible: true,
					});
					return;
				}

				if (result.audio_id && result.audio_url) {
					onAudioGenerated(
						{
							attachment_id: result.audio_id,
							audio_url: result.audio_url,
							duration: result.duration || '',
						},
						plainText,
						qualityTier
					);
					clearLockInFinally = false;
					createSuccessNotice(
						qualityTier === 'production'
							? __(
									'Production-quality spoken article audio generated successfully.',
									'prc-spoken-article'
								)
							: __(
									'Draft-quality spoken article audio generated successfully.',
									'prc-spoken-article'
								),
						{ type: 'snackbar', isDismissible: true }
					);
				}
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: __(
								'An unexpected error occurred while generating audio.',
								'prc-spoken-article'
							);
				createErrorNotice(message, {
					type: 'snackbar',
					isDismissible: true,
				});
			} finally {
				setIsGeneratingAudio(false);
				busyRef.current = false;
				unlockPostSaving('spoken-article-generating');
				if (clearLockInFinally) {
					setGeneratingLock(false);
				}
			}
		},
		[
			postId,
			postContent,
			getConfig,
			onAudioGenerated,
			createSuccessNotice,
			createErrorNotice,
			setGeneratingLock,
			lockPostSaving,
			unlockPostSaving,
			voiceId,
			audioQualityTier,
		]
	);

	useEffect(() => {
		if ((window as any).__prcSpokenArticleStartGenerate) {
			delete (window as any).__prcSpokenArticleStartGenerate;
			handleGenerateTranscript();
		}

		const handler = () => handleGenerateTranscript();
		window.addEventListener('prc-spoken-article:start-generate', handler);
		return () =>
			window.removeEventListener(
				'prc-spoken-article:start-generate',
				handler
			);
	}, [handleGenerateTranscript]);

	useEffect(() => {
		const handler = () => {
			setAudioQualityTier('production');
			void handleGenerateAudio('production');
		};
		window.addEventListener(GENERATE_PRODUCTION_AUDIO_EVENT, handler);
		return () =>
			window.removeEventListener(
				GENERATE_PRODUCTION_AUDIO_EVENT,
				handler
			);
	}, [handleGenerateAudio]);

	useEffect(() => {
		if (!isGeneratingAudio) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, [isGeneratingAudio]);

	const hasAudio = !!spokenArticle.attachment_id && !!spokenArticle.audio_url;
	const hasContent = !!postContent && postContent.trim().length > 10;
	const draftModelLabel = getModelLabelForQualityTier('draft');
	const productionModelLabel = getModelLabelForQualityTier('production');

	return (
		<div className="ai-generate-spoken-article">
			<VStack spacing={3}>
				{isRemoteLocked && (
					<Notice status="warning" isDismissible={false}>
						{sprintf(
							__(
								'%s is generating spoken article audio. Try again when they finish.',
								'prc-spoken-article'
							),
							remoteUserName ||
								__('Another editor', 'prc-spoken-article')
						)}
					</Notice>
				)}

				<RangeControl
					__nextHasNoMarginBottom
					label={`${__(
						'Target length:',
						'prc-spoken-article'
					)} ${targetMinutes} min`}
					value={targetMinutes}
					onChange={(val) => setTargetMinutes(val ?? 4)}
					min={1}
					max={8}
					step={0.5}
					withInputField={false}
				/>

				<AISuggestButton
					onClick={handleGenerateTranscript}
					isLoading={isFetchingText}
					disabled={isRemoteLocked || isGeneratingAudio}
					text={
						hasContent
							? __('Regenerate Transcript', 'prc-spoken-article')
							: __('Generate Transcript', 'prc-spoken-article')
					}
					label={__(
						'Generate AI transcript from parent post',
						'prc-spoken-article'
					)}
				/>

				{hasContent && !isGeneratingAudio && (
					<VStack spacing={2}>
						<Text size={12} weight={600}>
							{__('Audio quality', 'prc-spoken-article')}
						</Text>
						<ToggleGroupControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__('Audio quality', 'prc-spoken-article')}
							hideLabelFromVision
							value={audioQualityTier}
							onChange={(value) =>
								setAudioQualityTier(value as AudioQualityTier)
							}
							isBlock
						>
							<ToggleGroupControlOption
								value="draft"
								label={__('Draft', 'prc-spoken-article')}
							/>
							<ToggleGroupControlOption
								value="production"
								label={__('Production', 'prc-spoken-article')}
							/>
						</ToggleGroupControl>
						<Text size={12} color="#757575">
							{audioQualityTier === 'draft'
								? sprintf(
										/* translators: %s: ElevenLabs model label */
										__(
											'Draft audio uses %s — faster and cheaper for review.',
											'prc-spoken-article'
										),
										draftModelLabel
									)
								: sprintf(
										/* translators: %s: ElevenLabs model label */
										__(
											'Production audio uses %s — recommended before publish.',
											'prc-spoken-article'
										),
										productionModelLabel
									)}
						</Text>
						<Button
							variant="primary"
							onClick={() =>
								handleGenerateAudio(audioQualityTier)
							}
							disabled={isRemoteLocked || isFetchingText}
						>
							{audioQualityTier === 'production'
								? __(
										'Generate Production Audio',
										'prc-spoken-article'
									)
								: __(
										'Generate Draft Audio',
										'prc-spoken-article'
									)}
						</Button>
					</VStack>
				)}

				{isGeneratingAudio && (
					<Notice status="info" isDismissible={false}>
						<Spinner />
						{__(
							'Generating audio — do not close the browser.',
							'prc-spoken-article'
						)}
					</Notice>
				)}

				{hasAudio && !isGeneratingAudio && (
					<Notice status="info" isDismissible={false}>
						{__(
							'Audio exists. Generate a new transcript and audio to replace it.',
							'prc-spoken-article'
						)}
					</Notice>
				)}
			</VStack>
		</div>
	);
}
