/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState, useEffect, useRef, useCallback } from '@wordpress/element';
import {
	SearchControl,
	Button,
	Spinner,
	__experimentalText as Text,
} from '@wordpress/components';

interface ElevenLabsVoice {
	voice_id: string;
	name: string;
	category?: string;
	description?: string;
	preview_url?: string;
	labels?: Record<string, string>;
}

interface VoicesResponse {
	voices: ElevenLabsVoice[];
	has_more: boolean;
}

interface VoicePickerProps {
	selectedId: string;
	onSelect: (voiceId: string) => void;
}

export default function VoicePicker({ selectedId, onSelect }: VoicePickerProps) {
	const config = window.PRCSpokenArticleAI;
	const apiKey = config?.elevenlabs?.apiKey;

	const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
	const [search, setSearch] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [playingId, setPlayingId] = useState<string | null>(null);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>();

	const fetchVoices = useCallback(
		async (query: string) => {
			if (!apiKey) {
				setError(
					__(
						'ElevenLabs API key is not configured.',
						'prc-spoken-article'
					)
				);
				return;
			}

			setIsLoading(true);
			setError('');

			const params = new URLSearchParams({
				page_size: '30',
				sort: 'name',
				sort_direction: 'asc',
				include_total_count: 'false',
			});
			if (query) {
				params.set('search', query);
			}

			try {
				const res = await fetch(
					`https://api.elevenlabs.io/v2/voices?${params.toString()}`,
					{
						headers: {
							'xi-api-key': apiKey,
							Accept: 'application/json',
						},
					}
				);

				if (!res.ok) {
					throw new Error(`ElevenLabs API error: ${res.status}`);
				}

				const data = (await res.json()) as VoicesResponse;
				setVoices(data.voices ?? []);
			} catch (e) {
				setError(
					e instanceof Error
						? e.message
						: __('Failed to fetch voices.', 'prc-spoken-article')
				);
			} finally {
				setIsLoading(false);
			}
		},
		[apiKey]
	);

	useEffect(() => {
		fetchVoices('');
	}, [fetchVoices]);

	useEffect(() => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = setTimeout(() => {
			fetchVoices(search);
		}, 400);
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [search, fetchVoices]);

	const handleSelect = (voiceId: string) => {
		onSelect(voiceId);
	};

	const handlePreview = (voice: ElevenLabsVoice) => {
		if (!voice.preview_url) return;

		if (playingId === voice.voice_id) {
			audioRef.current?.pause();
			setPlayingId(null);
			return;
		}

		if (audioRef.current) {
			audioRef.current.pause();
		}

		const audio = new Audio(voice.preview_url);
		audioRef.current = audio;
		setPlayingId(voice.voice_id);

		audio.play().catch(() => setPlayingId(null));
		audio.addEventListener('ended', () => setPlayingId(null), {
			once: true,
		});
	};

	useEffect(() => {
		return () => {
			audioRef.current?.pause();
		};
	}, []);

	const labelString = (labels?: Record<string, string>) => {
		if (!labels) return '';
		return Object.values(labels).slice(0, 3).join(', ');
	};

	if (!apiKey) {
		return (
			<Text>
				{__(
					'ElevenLabs API key is not configured.',
					'prc-spoken-article'
				)}
			</Text>
		);
	}

	return (
		<div className="voice-picker">
			<SearchControl
				__nextHasNoMarginBottom
				value={search}
				onChange={setSearch}
				placeholder={__('Search voices…', 'prc-spoken-article')}
			/>

			{isLoading && (
				<div className="voice-picker__loading">
					<Spinner />
				</div>
			)}

			{error && (
				<Text className="voice-picker__error" isDestructive>
					{error}
				</Text>
			)}

			{!isLoading && !error && voices.length === 0 && (
				<Text className="voice-picker__empty">
					{__('No voices found.', 'prc-spoken-article')}
				</Text>
			)}

			<div
				className="voice-picker__list"
				style={{ maxHeight: 300, overflowY: 'auto' }}
			>
				{voices.map((voice) => {
					const isSelected = voice.voice_id === selectedId;
					const isPlaying = voice.voice_id === playingId;

					return (
						<div
							key={voice.voice_id}
							className={`voice-picker__item${isSelected ? ' is-selected' : ''}`}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 8,
								padding: '8px 4px',
								borderBottom: '1px solid #ddd',
								background: isSelected
									? 'rgba(0, 124, 186, 0.08)'
									: 'transparent',
								cursor: 'pointer',
							}}
							onClick={() => handleSelect(voice.voice_id)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleSelect(voice.voice_id);
								}
							}}
							role="option"
							aria-selected={isSelected}
							tabIndex={0}
						>
							{voice.preview_url && (
								<Button
									size="small"
									variant="tertiary"
									icon={
										isPlaying ? (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												width="16"
												height="16"
											>
												<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
											</svg>
										) : (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												width="16"
												height="16"
											>
												<path d="M8 5v14l11-7z" />
											</svg>
										)
									}
									onClick={(e: React.MouseEvent) => {
										e.stopPropagation();
										handlePreview(voice);
									}}
									label={
										isPlaying
											? __(
													'Stop preview',
													'prc-spoken-article'
												)
											: __(
													'Preview voice',
													'prc-spoken-article'
												)
									}
								/>
							)}

							<div
								style={{
									flex: 1,
									minWidth: 0,
									overflow: 'hidden',
								}}
							>
								<div
									style={{
										fontWeight: isSelected ? 600 : 400,
										whiteSpace: 'nowrap',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
									}}
								>
									{voice.name}
									{isSelected && ' ✓'}
								</div>
								{(voice.category ||
									labelString(voice.labels)) && (
									<div
										style={{
											fontSize: 11,
											color: '#757575',
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
										}}
									>
										{[
											voice.category,
											labelString(voice.labels),
										]
											.filter(Boolean)
											.join(' · ')}
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
