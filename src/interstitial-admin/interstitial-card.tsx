import { __ } from '@wordpress/i18n';
import { useState, useCallback } from '@wordpress/element';
import {
	Card,
	CardBody,
	CardHeader,
	TextControl,
	TextareaControl,
	RangeControl,
	ToggleControl,
	Button,
	Dropdown,
	Spinner,
	__experimentalHStack as HStack,
	__experimentalVStack as VStack,
	__experimentalText as Text,
} from '@wordpress/components';

import VoicePicker from '../shared/voice-picker';
import { generateAudioFromText } from '../shared/generate-audio-callback';
import { useMediaAudioUpload } from '../shared/use-media-upload';
import type { PRCSpokenArticleConfig } from '../shared/types';

interface InterstitialAd {
	id: string;
	label: string;
	text: string;
	textIsDraft: boolean;
	audioUrl: string;
	attachmentId: number;
	duration: string;
	voiceId: string;
	weight: number;
	isActive: boolean;
}

interface InterstitialCardProps {
	ad: InterstitialAd;
	onUpdate: (updates: Partial<InterstitialAd>) => void;
	onDelete: () => void;
}

export default function InterstitialCard({
	ad,
	onUpdate,
	onDelete,
}: InterstitialCardProps) {
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState('');
	const { openAudioLibrary } = useMediaAudioUpload();

	const handleGenerateAudio = useCallback(async () => {
		const config: PRCSpokenArticleConfig = window.PRCSpokenArticleAI;
		if (!config?.elevenlabs?.apiKey) {
			setError('ElevenLabs API key is not configured.');
			return;
		}

		if (!ad.text || ad.text.length < 10) {
			setError('Text must be at least 10 characters.');
			return;
		}

		setIsGenerating(true);
		setError('');

		const configWithVoice = ad.voiceId
			? {
					...config,
					elevenlabs: { ...config.elevenlabs, voiceId: ad.voiceId },
			  }
			: config;

		const result = await generateAudioFromText(configWithVoice, ad.text, 0);

		if (result.error) {
			setError(result.error);
		} else {
			onUpdate({
				audioUrl: result.audio_url,
				attachmentId: result.audio_id,
				duration: result.duration,
				textIsDraft: false,
			});
		}

		setIsGenerating(false);
	}, [ad.text, ad.voiceId, onUpdate]);

	const handleUploadAudio = useCallback(() => {
		setError('');
		openAudioLibrary({
			onSelect: ({ attachmentId, audioUrl, duration }) => {
				onUpdate({
					audioUrl,
					attachmentId,
					duration,
					textIsDraft: false,
				});
			},
		});
	}, [onUpdate, openAudioLibrary]);

	return (
		<Card className="interstitial-card" size="small">
			<CardHeader>
				<HStack alignment="center" justify="space-between">
					<Text weight={600}>
						{ad.label || __('Untitled Ad', 'prc-spoken-article')}
					</Text>
					<HStack spacing={2}>
						<ToggleControl
							__nextHasNoMarginBottom
							label={__('Active', 'prc-spoken-article')}
							checked={ad.isActive}
							onChange={(val) => onUpdate({ isActive: val })}
						/>
						<Button
							variant="tertiary"
							isDestructive
							size="small"
							onClick={onDelete}
						>
							{__('Delete', 'prc-spoken-article')}
						</Button>
					</HStack>
				</HStack>
			</CardHeader>
			<CardBody>
				<VStack spacing={4}>
					<TextControl
						__nextHasNoMarginBottom
						label={__('Label', 'prc-spoken-article')}
						value={ad.label}
						onChange={(val) => onUpdate({ label: val })}
					/>

					<RangeControl
						__nextHasNoMarginBottom
						label={`${__('Weight:', 'prc-spoken-article')} ${
							ad.weight
						}`}
						value={ad.weight}
						onChange={(val) => onUpdate({ weight: val ?? 5 })}
						min={1}
						max={10}
						withInputField={false}
					/>

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
								{ad.voiceId
									? __('Change Voice', 'prc-spoken-article')
									: __('Select Voice…', 'prc-spoken-article')}
							</Button>
						)}
						renderContent={({ onClose }) => (
							<div style={{ padding: 12, width: 360 }}>
								<VoicePicker
									selectedId={ad.voiceId}
									onSelect={(voiceId) => {
										onUpdate({ voiceId });
										onClose();
									}}
								/>
							</div>
						)}
					/>

					<TextareaControl
						__nextHasNoMarginBottom
						label={__('Ad Copy / Transcript', 'prc-spoken-article')}
						value={ad.text}
						onChange={(val) =>
							onUpdate({ text: val, textIsDraft: true })
						}
						rows={6}
					/>
					<Text variant="muted">
						{__('Characters:', 'prc-spoken-article')}{' '}
						{ad.text.length.toLocaleString()}
					</Text>

					{ad.audioUrl ? (
						<div>
							<Text weight={600}>
								{__('Audio Preview', 'prc-spoken-article')}
							</Text>
							<audio
								controls
								preload="metadata"
								src={ad.audioUrl}
								style={{ width: '100%', marginTop: 4 }}
							/>
							<HStack spacing={2} style={{ marginTop: 8 }}>
								<Text variant="muted">
									{__('Duration:', 'prc-spoken-article')}{' '}
									{ad.duration}
								</Text>
								<Button
									variant="secondary"
									isDestructive
									size="small"
									onClick={() =>
										onUpdate({
											audioUrl: '',
											attachmentId: 0,
											duration: '',
										})
									}
								>
									{__('Remove Audio', 'prc-spoken-article')}
								</Button>
							</HStack>
						</div>
					) : (
						<div>
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
											!ad.text || ad.text.length < 10
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
						</div>
					)}

					{error && <Text isDestructive>{error}</Text>}
				</VStack>
			</CardBody>
		</Card>
	);
}
