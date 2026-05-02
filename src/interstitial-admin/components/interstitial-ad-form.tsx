import { useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	TextControl,
	TextareaControl,
	RangeControl,
	ToggleControl,
	Button,
	Dropdown,
	Flex,
	FlexItem,
	FlexBlock,
	__experimentalHStack as HStack,
	__experimentalVStack as VStack,
	__experimentalText as Text,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';

import { store as interstitialsStore } from '../store';
import VoicePicker from '../../shared/voice-picker';
import AudioControls from './audio-controls';
import type { InterstitialAd } from '../types';

interface InterstitialAdFormProps {
	adId: string;
}

export default function InterstitialAdForm({ adId }: InterstitialAdFormProps) {
	const ad = useSelect(
		(select) =>
			select(interstitialsStore)
				.getAds()
				.find((a: InterstitialAd) => a.id === adId) ?? null,
		[adId]
	);

	const { updateAd } = useDispatch(interstitialsStore);

	const handleUpdate = useCallback(
		(updates: Partial<InterstitialAd>) => {
			updateAd(adId, updates);
		},
		[adId, updateAd]
	);

	if (!ad) {
		return null;
	}

	return (
		<VStack spacing={4} className="interstitial-settings__ad-form">
			<HStack
				spacing={4}
				alignment="flex-end"
				justify="space-between"
				className="interstitial-settings__ad-form-row"
			>
				<div style={{ flexGrow: 1 }}>
					<TextControl
						__nextHasNoMarginBottom
						label={__('Label', 'prc-spoken-article')}
						value={ad.label}
						onChange={(val) => handleUpdate({ label: val })}
					/>
				</div>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__('Active', 'prc-spoken-article')}
					checked={ad.isActive}
					onChange={(val) => handleUpdate({ isActive: val })}
				/>
			</HStack>

			<RangeControl
				__nextHasNoMarginBottom
				label={`${__('Weight:', 'prc-spoken-article')} ${ad.weight}`}
				value={ad.weight}
				onChange={(val) => handleUpdate({ weight: val ?? 5 })}
				min={1}
				max={10}
				withInputField={false}
			/>

			<Dropdown
				popoverProps={{ placement: 'bottom-start' }}
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
					<div className="interstitial-settings__voice-picker-popover">
						<VoicePicker
							selectedId={ad.voiceId}
							onSelect={(voiceId) => {
								handleUpdate({ voiceId });
								onClose();
							}}
						/>
					</div>
				)}
			/>

			<div>
				<TextareaControl
					__nextHasNoMarginBottom
					label={__('Ad Copy / Transcript', 'prc-spoken-article')}
					value={ad.text}
					onChange={(val) =>
						handleUpdate({ text: val, textIsDraft: true })
					}
					rows={6}
				/>
				<Text
					variant="muted"
					className="interstitial-settings__char-count"
				>
					{__('Characters:', 'prc-spoken-article')}{' '}
					{ad.text.length.toLocaleString()}
				</Text>
			</div>

			<AudioControls
				adId={adId}
				text={ad.text}
				voiceId={ad.voiceId}
				audioUrl={ad.audioUrl}
				duration={ad.duration}
				onAudioChange={handleUpdate}
			/>
		</VStack>
	);
}
