/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState, useEffect, useRef, useCallback } from '@wordpress/element';
import {
	SearchControl,
	Spinner,
	__experimentalText as Text,
} from '@wordpress/components';

import type { ElevenLabsVoice } from './voice-types';
import VoicePickerItem from './voice-picker-item';

interface VoicesResponse {
	voices: ElevenLabsVoice[];
	has_more: boolean;
}

interface VoicePickerProps {
	selectedId: string;
	onSelect: (voiceId: string, voice: ElevenLabsVoice) => void;
}

export default function VoicePicker({
	selectedId,
	onSelect,
}: VoicePickerProps) {
	const config = window.PRCSpokenArticleAI;
	const isConnected = !!config?.elevenlabs?.connected;
	const restBase = config?.restBase;
	const restNonce = config?.restNonce;

	const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
	const [search, setSearch] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [playingId, setPlayingId] = useState<string | null>(null);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>();

	const fetchVoices = useCallback(
		async (query: string) => {
			if (!isConnected || !restBase || !restNonce) {
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
			});
			if (query) {
				params.set('search', query);
			}

			try {
				const res = await fetch(
					`${restBase}/elevenlabs/voices?${params.toString()}`,
					{
						headers: {
							'X-WP-Nonce': restNonce,
							Accept: 'application/json',
						},
					}
				);

				if (!res.ok) {
					const body = await res.text();
					throw new Error(
						body || `Voices proxy error: ${res.status}`
					);
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
		[isConnected, restBase, restNonce]
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

	const handleSelect = (voice: ElevenLabsVoice) => {
		onSelect(voice.voice_id, voice);
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

	if (!isConnected) {
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
				{voices.map((voice) => (
					<VoicePickerItem
						key={voice.voice_id}
						voice={voice}
						isSelected={voice.voice_id === selectedId}
						isPlaying={voice.voice_id === playingId}
						onSelect={handleSelect}
						onPreview={handlePreview}
					/>
				))}
			</div>
		</div>
	);
}
