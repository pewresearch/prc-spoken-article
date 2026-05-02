/**
 * WordPress Dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import {
	PanelBody,
	PanelRow,
	ToggleControl,
	TextareaControl,
	Button,
	Dropdown,
	Notice,
	Spinner,
	__experimentalText as Text,
	__experimentalHStack as HStack,
} from '@wordpress/components';

/**
 * Internal Dependencies
 */
import VoicePicker from '../shared/voice-picker';
import {
	useInterstitialAudioActions,
	type InterstitialMeta,
} from './use-interstitial-audio-actions';

interface InterstitialPanelProps {
	interstitial: InterstitialMeta;
	interstitialEnabled: boolean;
	onUpdateInterstitial: (updates: Partial<InterstitialMeta>) => void;
	onSetEnabled: (enabled: boolean) => void;
	isRemoteLocked: boolean;
	remoteUserName: string;
	setGeneratingLock: (active: boolean) => void;
}

export default function InterstitialPanel({
	interstitial,
	interstitialEnabled,
	onUpdateInterstitial,
	onSetEnabled,
	isRemoteLocked,
	remoteUserName,
	setGeneratingLock,
}: InterstitialPanelProps) {
	const postId = useSelect(
		(select) =>
			(
				select(editorStore) as { getCurrentPostId: () => number }
			).getCurrentPostId(),
		[]
	);

	const { isGenerating, error, handleGenerateAudio, handleUploadAudio } =
		useInterstitialAudioActions(
			interstitial,
			postId,
			onUpdateInterstitial,
			setGeneratingLock
		);

	const settingsUrl = (window as any).PRCSpokenArticleConfig
		?.interstitialAdminUrl;

	return (
		<PanelBody
			title={__('Interstitial Ad', 'prc-spoken-article')}
			initialOpen={false}
		>
			<PanelRow>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__(
						'Use custom interstitial for this article',
						'prc-spoken-article'
					)}
					checked={interstitialEnabled}
					onChange={onSetEnabled}
				/>
			</PanelRow>

			{!interstitialEnabled && (
				<PanelRow>
					<Notice status="info" isDismissible={false}>
						{__(
							'Global interstitial rotation will be used.',
							'prc-spoken-article'
						)}{' '}
						{settingsUrl && (
							<a
								href={settingsUrl}
								target="_blank"
								rel="noreferrer"
							>
								{__('Manage global ads', 'prc-spoken-article')}
							</a>
						)}
					</Notice>
				</PanelRow>
			)}

			{interstitialEnabled && (
				<>
					{isRemoteLocked && (
						<PanelRow>
							<Notice status="warning" isDismissible={false}>
								{sprintf(
									/* translators: %s: another editor's display name */
									__(
										'%s is generating audio for this post. Try again when they finish.',
										'prc-spoken-article'
									),
									remoteUserName ||
										__(
											'Another editor',
											'prc-spoken-article'
										)
								)}
							</Notice>
						</PanelRow>
					)}
					<PanelRow>
						<Dropdown
							popoverProps={{
								placement: 'bottom-start',
							}}
							renderToggle={({ isOpen, onToggle }) => (
								<Button
									variant="secondary"
									onClick={onToggle}
									aria-expanded={isOpen}
								>
									{interstitial.voiceId
										? __(
												'Change Voice',
												'prc-spoken-article'
										  )
										: __(
												'Select Voice…',
												'prc-spoken-article'
										  )}
								</Button>
							)}
							renderContent={({ onClose }) => (
								<div style={{ padding: 12, width: 320 }}>
									<VoicePicker
										selectedId={interstitial.voiceId}
										onSelect={(voiceId) => {
											onUpdateInterstitial({ voiceId });
											onClose();
										}}
									/>
								</div>
							)}
						/>
					</PanelRow>

					<PanelRow>
						<div style={{ width: '100%' }}>
							<TextareaControl
								__nextHasNoMarginBottom
								label={__(
									'Ad Copy / Transcript',
									'prc-spoken-article'
								)}
								value={interstitial.text}
								onChange={(val) =>
									onUpdateInterstitial({
										text: val,
										textIsDraft: true,
									})
								}
								rows={6}
							/>
							<Text variant="muted">
								{__('Characters:', 'prc-spoken-article')}{' '}
								{interstitial.text.length.toLocaleString()}
							</Text>
						</div>
					</PanelRow>

					{interstitial.audioUrl ? (
						<PanelRow>
							<div style={{ width: '100%' }}>
								<audio
									controls
									preload="metadata"
									src={interstitial.audioUrl}
									style={{ width: '100%' }}
								/>
								<HStack spacing={2} style={{ marginTop: 8 }}>
									<Text variant="muted">
										{__('Duration:', 'prc-spoken-article')}{' '}
										{interstitial.duration}
									</Text>
									<Button
										variant="secondary"
										isDestructive
										size="small"
										onClick={() =>
											onUpdateInterstitial({
												audioUrl: '',
												attachmentId: 0,
												duration: '',
											})
										}
									>
										{__(
											'Remove Audio',
											'prc-spoken-article'
										)}
									</Button>
								</HStack>
							</div>
						</PanelRow>
					) : (
						<PanelRow>
							{isGenerating ? (
								<HStack alignment="center" spacing={2}>
									<Spinner />
									<Text>
										{__(
											'Generating audio…',
											'prc-spoken-article'
										)}
									</Text>
								</HStack>
							) : (
								<HStack
									spacing={2}
									style={{ flexWrap: 'wrap' }}
								>
									<Button
										variant="primary"
										onClick={handleGenerateAudio}
										disabled={
											!interstitial.text ||
											interstitial.text.length < 10 ||
											isRemoteLocked
										}
									>
										{__(
											'Generate Audio',
											'prc-spoken-article'
										)}
									</Button>
									<Button
										variant="secondary"
										onClick={handleUploadAudio}
									>
										{__(
											'Upload Audio',
											'prc-spoken-article'
										)}
									</Button>
								</HStack>
							)}
						</PanelRow>
					)}

					{error && (
						<PanelRow>
							<Notice status="error" isDismissible={false}>
								{error}
							</Notice>
						</PanelRow>
					)}
				</>
			)}
		</PanelBody>
	);
}
