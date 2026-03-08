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
	Popover,
	Spinner,
	TextareaControl,
	RangeControl,
	Button,
	__experimentalHStack as HStack,
	__experimentalVStack as VStack,
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
	voiceId,
	targetMinutes,
	setTargetMinutes,
}: {
	spokenArticle: SpokenArticleMeta;
	setSpokenArticle: (data: SpokenArticleMeta) => void;
	transcript: string;
	transcriptIsDraft: boolean;
	setTranscript: (text: string, isDraft: boolean) => void;
	onAudioGenerated: (data: SpokenArticleMeta, transcriptText: string) => void;
	voiceId: string;
	targetMinutes: number;
	setTargetMinutes: (val: number) => void;
}) {
	const [isFetchingText, setIsFetchingText] = useState(false);
	const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [reviewText, setReviewText] = useState('');
	const [charCount, setCharCount] = useState(0);
	// The target_minutes value used for the last fetch, so we can detect changes.
	const [fetchedAtMinutes, setFetchedAtMinutes] = useState(4);
	// Whether the modal was pre-populated from a saved draft (vs. freshly fetched)
	const [isPrePopulatedFromDraft, setIsPrePopulatedFromDraft] =
		useState(false);
	const [isTargetPopoverOpen, setIsTargetPopoverOpen] = useState(false);
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
			setFetchedAtMinutes(targetMinutes);
			setIsModalOpen(true);
		},
		[targetMinutes]
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
			const result = await fetchTtsText(config, postId, targetMinutes);
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
		targetMinutes,
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
			const result = await fetchTtsText(config, postId, targetMinutes);
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
			setFetchedAtMinutes(targetMinutes);
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
	}, [postId, targetMinutes, getConfig, createErrorNotice]);

	// Refresh from AI and open the modal — used by external callers (sidebar panel).
	const handleRefreshAndOpen = useCallback(async () => {
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
			const result = await fetchTtsText(config, postId, targetMinutes);
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
		targetMinutes,
		getConfig,
		createErrorNotice,
		openModalWithText,
	]);

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

		busyRef.current = true;
		setIsGeneratingAudio(true);

		try {
			const configWithVoice = voiceId
				? { ...config, elevenlabs: { ...config.elevenlabs, voiceId } }
				: config;
			const result = await generateAudioFromText(
				configWithVoice,
				postId,
				reviewText
			);

			if (result.error && result.error.length > 0) {
				createErrorNotice(result.error, {
					type: 'snackbar',
					isDismissible: true,
				});
				setIsModalOpen(false);
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
				setIsModalOpen(false);
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
			setIsModalOpen(false);
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

	useEffect(() => {
		const handler = () => handleRefreshAndOpen();
		window.addEventListener('prc-spoken-article:refresh-from-ai', handler);
		return () =>
			window.removeEventListener(
				'prc-spoken-article:refresh-from-ai',
				handler
			);
	}, [handleRefreshAndOpen]);

	useEffect(() => {
		if (!isGeneratingAudio) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, [isGeneratingAudio]);

	const hasAudio = !!spokenArticle.attachment_id && !!spokenArticle.audio_url;

	return (
		<div className="ai-generate-spoken-article">
			{!isGeneratingAudio && (
				<VStack gap={12}>
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
						onClick={handleFetchText}
						isLoading={isFetchingText}
						text={
							hasAudio
								? __('Generate with AI', 'prc-spoken-article')
								: __('Generate with AI', 'prc-spoken-article')
						}
						label={__(
							'Generate spoken article audio',
							'prc-spoken-article'
						)}
					/>
					{hasAudio && (
						<Notice status="info" isDismissible={false}>
							{__(
								'Audio has already been generated. Click above to replace it.',
								'prc-spoken-article'
							)}
						</Notice>
					)}
				</VStack>
			)}
			{isModalOpen && (
				<Modal
					title={
						isGeneratingAudio
							? __('Generating Audio', 'prc-spoken-article')
							: __('Review Text for Audio', 'prc-spoken-article')
					}
					onRequestClose={
						isGeneratingAudio
							? undefined
							: () => setIsModalOpen(false)
					}
					isDismissible={!isGeneratingAudio}
					size="large"
				>
					{isGeneratingAudio ? (
						<div className="ai-generate-spoken-article__generating">
							<Spinner />
							<p className="ai-generate-spoken-article__generating-message">
								{__(
									'Audio generating, this may take a few minutes — do not close the browser.',
									'prc-spoken-article'
								)}
							</p>
						</div>
					) : (
						<>
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
							<HStack justify="space-between" alignment="center">
								<Button
									variant="link"
									onClick={() =>
										setIsTargetPopoverOpen(
											!isTargetPopoverOpen
										)
									}
									size="small"
								>
									{__('Characters:', 'prc-spoken-article')}{' '}
									{reviewText.length.toLocaleString()}
									{charCount !== reviewText.length &&
										` (${__(
											'originally',
											'prc-spoken-article'
										)} ${charCount.toLocaleString()})`}
									{` · ~${(
										reviewText.length /
										5 /
										150
									).toFixed(1)} min`}
								</Button>
								{isTargetPopoverOpen && (
									<Popover
										placement="bottom-start"
										shift
										onClose={() =>
											setIsTargetPopoverOpen(false)
										}
									>
										<div
											style={{
												padding: '16px',
												paddingBottom: '30px',
												minWidth: '280px',
											}}
										>
											<RangeControl
												__nextHasNoMarginBottom
												label={`${__(
													'Target length:',
													'prc-spoken-article'
												)} ${targetMinutes} min (~${Math.round(
													targetMinutes * 150
												)} ${__(
													'words',
													'prc-spoken-article'
												)})`}
												value={targetMinutes}
												onChange={(val) =>
													setTargetMinutes(val ?? 4)
												}
												min={1}
												max={8}
												step={0.5}
												withInputField={false}
											/>
										</div>
									</Popover>
								)}
								{(isPrePopulatedFromDraft ||
									targetMinutes !== fetchedAtMinutes) && (
									<Button
										variant="link"
										onClick={handleRefreshFromAI}
										disabled={isFetchingText}
										size="small"
									>
										{isFetchingText
											? __(
													'Refreshing…',
													'prc-spoken-article'
											  )
											: __(
													'Refresh from AI',
													'prc-spoken-article'
											  )}
									</Button>
								)}
							</HStack>
							<TextareaControl
								__nextHasNoMarginBottom
								label={__(
									'Text to be spoken',
									'prc-spoken-article'
								)}
								hideLabelFromVision
								value={reviewText}
								onChange={setReviewText}
								disabled={isFetchingText}
								rows={15}
								style={{ width: '100%', marginTop: '12px' }}
							/>
							<HStack
								justify="flex-end"
								style={{ marginTop: '16px' }}
							>
								<Button
									variant="tertiary"
									onClick={() => setIsModalOpen(false)}
								>
									{__('Cancel', 'prc-spoken-article')}
								</Button>
								<Button
									variant="secondary"
									onClick={handleSaveDraft}
									disabled={
										!reviewText || reviewText.length < 10
									}
								>
									{__('Save Draft', 'prc-spoken-article')}
								</Button>
								<Button
									variant="primary"
									onClick={handleGenerateAudio}
									disabled={
										!reviewText || reviewText.length < 10
									}
								>
									{__('Generate Audio', 'prc-spoken-article')}
								</Button>
							</HStack>
						</>
					)}
				</Modal>
			)}
		</div>
	);
}
