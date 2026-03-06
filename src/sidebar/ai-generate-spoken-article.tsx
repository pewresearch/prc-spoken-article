/**
 * External Dependencies
 */
import { AISuggestButton } from '@prc/components';

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState, useCallback, useRef, useEffect } from '@wordpress/element';
import {
	Modal,
	Notice,
	Spinner,
	TextareaControl,
	Button,
	__experimentalHStack as HStack,
	__experimentalText as Text,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';

/**
 * Internal Dependencies
 */
import {
	fetchTtsText,
	generateAudioFromText,
	type PRCSpokenArticleConfig,
} from './generate-spoken-article-callback';

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

export default function AIGenerateSpokenArticle({
	spokenArticle,
	setSpokenArticle,
	transcript,
	transcriptIsDraft,
	setTranscript,
	onAudioGenerated,
}: {
	spokenArticle: SpokenArticleMeta;
	setSpokenArticle: (data: SpokenArticleMeta) => void;
	transcript: string;
	transcriptIsDraft: boolean;
	setTranscript: (text: string, isDraft: boolean) => void;
	onAudioGenerated: (data: SpokenArticleMeta, transcriptText: string) => void;
}) {
	const [isFetchingText, setIsFetchingText] = useState(false);
	const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [reviewText, setReviewText] = useState('');
	const [charCount, setCharCount] = useState(0);
	// Whether the modal was pre-populated from a saved draft (vs. freshly fetched)
	const [isPrePopulatedFromDraft, setIsPrePopulatedFromDraft] =
		useState(false);
	const busyRef = useRef(false);

	const postId = useSelect(
		(select: {
			(key: string): { getCurrentPostId: () => number | undefined };
		}) => select('core/editor').getCurrentPostId(),
		[]
	);

	const { createSuccessNotice, createErrorNotice } =
		useDispatch(noticesStore);

	const getConfig = useCallback((): PRCSpokenArticleConfig | null => {
		const config = window.PRCSpokenArticleAI;
		if (!config?.elevenlabs?.apiKey) {
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

	const openModalWithText = useCallback(
		(text: string, originalCharCount: number, fromDraft: boolean) => {
			setReviewText(text);
			setCharCount(originalCharCount);
			setIsPrePopulatedFromDraft(fromDraft);
			setIsModalOpen(true);
		},
		[]
	);

	const handleFetchText = useCallback(async () => {
		if (!postId || busyRef.current) {
			return;
		}

		// If a draft transcript exists, pre-populate from it without hitting the server.
		if (transcript && transcriptIsDraft) {
			openModalWithText(transcript, transcript.length, true);
			return;
		}

		const config = getConfig();
		if (!config) {
			return;
		}

		busyRef.current = true;
		setIsFetchingText(true);

		try {
			const result = await fetchTtsText(config, postId);
			if (!result.text || result.text.length < 10) {
				createErrorNotice(
					__(
						'Not enough text content to generate audio.',
						'prc-spoken-article'
					),
					{ type: 'snackbar', isDismissible: true }
				);
				return;
			}
			openModalWithText(result.text, result.charCount, false);
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
		postId,
		transcript,
		transcriptIsDraft,
		getConfig,
		createErrorNotice,
		openModalWithText,
	]);

	// Refresh from AI — explicitly re-fetch from the server, ignoring any saved draft.
	const handleRefreshFromAI = useCallback(async () => {
		if (!postId || busyRef.current) {
			return;
		}
		const config = getConfig();
		if (!config) {
			return;
		}

		busyRef.current = true;
		setIsFetchingText(true);

		try {
			const result = await fetchTtsText(config, postId);
			if (!result.text || result.text.length < 10) {
				createErrorNotice(
					__(
						'Not enough text content to generate audio.',
						'prc-spoken-article'
					),
					{ type: 'snackbar', isDismissible: true }
				);
				return;
			}
			setReviewText(result.text);
			setCharCount(result.charCount);
			setIsPrePopulatedFromDraft(false);
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
	}, [postId, getConfig, createErrorNotice]);

	const handleSaveDraft = useCallback(() => {
		setTranscript(reviewText, true);
		setIsModalOpen(false);
		createSuccessNotice(
			__(
				'Transcript saved as draft. Edit it in the sidebar before generating audio.',
				'prc-spoken-article'
			),
			{ type: 'snackbar', isDismissible: true }
		);
	}, [reviewText, setTranscript, createSuccessNotice]);

	const handleGenerateAudio = useCallback(async () => {
		if (!postId || busyRef.current) {
			return;
		}
		const config = getConfig();
		if (!config) {
			return;
		}

		setIsModalOpen(false);
		busyRef.current = true;
		setIsGeneratingAudio(true);

		try {
			const result = await generateAudioFromText(
				config,
				postId,
				reviewText
			);

			if (result.error && result.error.length > 0) {
				createErrorNotice(result.error, {
					type: 'snackbar',
					isDismissible: true,
				});
				return;
			}

			if (result.audio_id && result.audio_url) {
				// Single combined update to avoid stale-meta overwrites between
				// the audio and transcript fields.
				onAudioGenerated(
					{
						attachment_id: result.audio_id,
						audio_url: result.audio_url,
						duration: result.duration || '',
					},
					reviewText
				);
				createSuccessNotice(
					__(
						'Spoken article audio generated successfully.',
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
		}
	}, [
		postId,
		reviewText,
		getConfig,
		onAudioGenerated,
		createSuccessNotice,
		createErrorNotice,
	]);

	useEffect(() => {
		if ((window as any).__prcSpokenArticleStartGenerate) {
			delete (window as any).__prcSpokenArticleStartGenerate;
			handleFetchText();
		}

		const handler = () => handleFetchText();
		window.addEventListener('prc-spoken-article:start-generate', handler);
		return () =>
			window.removeEventListener(
				'prc-spoken-article:start-generate',
				handler
			);
	}, [handleFetchText]);

	const hasAudio = !!spokenArticle.attachment_id && !!spokenArticle.audio_url;

	return (
		<div className="ai-generate-spoken-article">
			{isGeneratingAudio && (
				<div className="ai-generate-spoken-article__generating">
					<Spinner />
					<p className="ai-generate-spoken-article__generating-message">
						{__(
							'Audio generating, this may take a few minutes — do not close the browser.',
							'prc-spoken-article'
						)}
					</p>
				</div>
			)}
			{!isGeneratingAudio && (
				<>
					{hasAudio && (
						<Notice status="info" isDismissible={false}>
							{__(
								'Audio has already been generated. Click below to replace it.',
								'prc-spoken-article'
							)}
						</Notice>
					)}
					<AISuggestButton
						onClick={handleFetchText}
						isLoading={isFetchingText}
						text={
							hasAudio
								? __('Regenerate with AI', 'prc-spoken-article')
								: __('Generate with AI', 'prc-spoken-article')
						}
						label={__(
							'Generate spoken article audio',
							'prc-spoken-article'
						)}
					/>
				</>
			)}
			{isModalOpen && (
				<Modal
					title={__('Review Text for Audio', 'prc-spoken-article')}
					onRequestClose={() => setIsModalOpen(false)}
					size="large"
				>
					<HStack justify="space-between" alignment="center">
						<Text variant="muted">
							{__('Characters:', 'prc-spoken-article')}{' '}
							{reviewText.length.toLocaleString()}
							{charCount !== reviewText.length &&
								` (${__(
									'originally',
									'prc-spoken-article'
								)} ${charCount.toLocaleString()})`}
						</Text>
						{isPrePopulatedFromDraft && (
							<Button
								variant="link"
								onClick={handleRefreshFromAI}
								disabled={isFetchingText}
								size="small"
							>
								{isFetchingText
									? __('Refreshing…', 'prc-spoken-article')
									: __(
											'Refresh from AI',
											'prc-spoken-article'
										)}
							</Button>
						)}
					</HStack>
					{isPrePopulatedFromDraft && (
						<Notice
							status="info"
							isDismissible={false}
							style={{ marginTop: '8px' }}
						>
							{__(
								'Pre-populated from your saved draft transcript.',
								'prc-spoken-article'
							)}
						</Notice>
					)}
					<TextareaControl
						__nextHasNoMarginBottom
						label={__('Text to be spoken', 'prc-spoken-article')}
						hideLabelFromVision
						value={reviewText}
						onChange={setReviewText}
						rows={15}
						style={{ width: '100%', marginTop: '12px' }}
					/>
					<HStack justify="flex-end" style={{ marginTop: '16px' }}>
						<Button
							variant="tertiary"
							onClick={() => setIsModalOpen(false)}
						>
							{__('Cancel', 'prc-spoken-article')}
						</Button>
						<Button
							variant="secondary"
							onClick={handleSaveDraft}
							disabled={!reviewText || reviewText.length < 10}
						>
							{__('Save Draft', 'prc-spoken-article')}
						</Button>
						<Button
							variant="primary"
							onClick={handleGenerateAudio}
							disabled={!reviewText || reviewText.length < 10}
						>
							{__('Generate Audio', 'prc-spoken-article')}
						</Button>
					</HStack>
				</Modal>
			)}
		</div>
	);
}
