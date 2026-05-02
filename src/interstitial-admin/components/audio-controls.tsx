import { useState, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button,
	Spinner,
	__experimentalHStack as HStack,
	__experimentalText as Text,
} from '@wordpress/components';

import { generateAudioFromText } from '../../shared/generate-audio-callback';
import { useMediaAudioUpload } from '../../shared/use-media-upload';
import type { PRCSpokenArticleConfig } from '../../shared/types';

interface AudioControlsProps {
	adId: string;
	text: string;
	voiceId: string;
	audioUrl: string;
	duration: string;
	onAudioChange: (updates: {
		audioUrl: string;
		attachmentId: number;
		duration: string;
		textIsDraft: boolean;
	}) => void;
}

export default function AudioControls({
	adId: _adId,
	text,
	voiceId,
	audioUrl,
	duration,
	onAudioChange,
}: AudioControlsProps) {
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState('');
	const { openAudioLibrary } = useMediaAudioUpload();

	const handleGenerateAudio = useCallback(async () => {
		const config: PRCSpokenArticleConfig = window.PRCSpokenArticleAI;
		if (!config?.elevenlabs?.apiKey) {
			setError('ElevenLabs API key is not configured.');
			return;
		}

		if (!text || text.length < 10) {
			setError('Text must be at least 10 characters.');
			return;
		}

		setIsGenerating(true);
		setError('');

		const configWithVoice = voiceId
			? {
					...config,
					elevenlabs: { ...config.elevenlabs, voiceId },
			  }
			: config;

		const result = await generateAudioFromText(configWithVoice, text, 0);

		if (result.error) {
			setError(result.error);
		} else {
			onAudioChange({
				audioUrl: result.audio_url,
				attachmentId: result.audio_id,
				duration: result.duration,
				textIsDraft: false,
			});
		}

		setIsGenerating(false);
	}, [text, voiceId, onAudioChange]);

	const handleUploadAudio = useCallback(() => {
		setError('');
		openAudioLibrary({
			onSelect: ({ attachmentId, audioUrl: url, duration: dur }) => {
				onAudioChange({
					audioUrl: url,
					attachmentId,
					duration: dur,
					textIsDraft: false,
				});
			},
		});
	}, [onAudioChange, openAudioLibrary]);

	const handleRemoveAudio = () => {
		onAudioChange({
			audioUrl: '',
			attachmentId: 0,
			duration: '',
			textIsDraft: true,
		});
	};

	if (audioUrl) {
		return (
			<div className="interstitial-settings__audio-preview">
				<Text
					className="interstitial-settings__audio-preview-label"
					weight={600}
				>
					{__('Audio Preview', 'prc-spoken-article')}
				</Text>
				<audio
					controls
					preload="metadata"
					src={audioUrl}
					className="interstitial-settings__audio-player"
				/>
				<HStack
					spacing={2}
					className="interstitial-settings__audio-meta"
				>
					<Text variant="muted">
						{__('Duration:', 'prc-spoken-article')} {duration}
					</Text>
					<Button
						variant="secondary"
						isDestructive
						size="small"
						onClick={handleRemoveAudio}
					>
						{__('Remove Audio', 'prc-spoken-article')}
					</Button>
				</HStack>
			</div>
		);
	}

	return (
		<div className="interstitial-settings__audio-actions">
			{isGenerating ? (
				<HStack alignment="center" spacing={2}>
					<Spinner />
					<Text>{__('Generating audio…', 'prc-spoken-article')}</Text>
				</HStack>
			) : (
				<HStack
					spacing={2}
					className="interstitial-settings__audio-buttons"
				>
					<Button
						variant="primary"
						onClick={handleGenerateAudio}
						disabled={!text || text.length < 10}
					>
						{__('Generate Audio', 'prc-spoken-article')}
					</Button>
					<Button variant="secondary" onClick={handleUploadAudio}>
						{__('Upload Audio', 'prc-spoken-article')}
					</Button>
				</HStack>
			)}
			{error && (
				<Text
					className="interstitial-settings__audio-error"
					isDestructive
				>
					{error}
				</Text>
			)}
		</div>
	);
}
