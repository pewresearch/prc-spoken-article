import { useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button,
	Dropdown,
	__experimentalText as Text,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { DataForm } from '@wordpress/dataviews';
import type { DataFormControlProps, Field } from '@wordpress/dataviews';

import { store as interstitialsStore } from '../store';
import VoicePicker from '../../shared/voice-picker';
import AudioControls from './audio-controls';
import type { InterstitialAd } from '../types';

const TEXT_CHAR_COUNT_FIELD_ID = '__text_char_count';
const AUDIO_FIELD_ID = '__audio';

interface InterstitialAdFormProps {
	adId: string;
}

function VoicePickerEdit({
	data,
	onChange,
}: DataFormControlProps<InterstitialAd>) {
	return (
		<Dropdown
			popoverProps={{ placement: 'bottom-start' }}
			renderToggle={({ isOpen, onToggle }) => (
				<Button
					variant="secondary"
					onClick={onToggle}
					aria-expanded={isOpen}
				>
					{data.voiceId
						? __('Change Voice', 'prc-spoken-article')
						: __('Select Voice…', 'prc-spoken-article')}
				</Button>
			)}
			renderContent={({ onClose }) => (
				<div className="interstitial-settings__voice-picker-popover">
					<VoicePicker
						selectedId={data.voiceId}
						onSelect={(voiceId) => {
							onChange({ voiceId });
							onClose();
						}}
					/>
				</div>
			)}
		/>
	);
}

function AudioControlsEdit({
	data,
	onChange,
}: DataFormControlProps<InterstitialAd>) {
	return (
		<AudioControls
			adId={data.id}
			text={data.text}
			voiceId={data.voiceId}
			audioUrl={data.audioUrl}
			duration={data.duration}
			onAudioChange={onChange}
		/>
	);
}

function TextCharCountRender({ item }: { item: InterstitialAd }) {
	return (
		<Text variant="muted" className="interstitial-settings__char-count">
			{__('Characters:', 'prc-spoken-article')}{' '}
			{item.text.length.toLocaleString()}
		</Text>
	);
}

const AD_FORM_FIELDS: Field<InterstitialAd>[] = [
	{
		id: 'label',
		type: 'text',
		label: __('Label', 'prc-spoken-article'),
	},
	{
		id: 'isActive',
		type: 'boolean',
		label: __('Active', 'prc-spoken-article'),
		Edit: 'toggle',
	},
	{
		id: 'weight',
		type: 'integer',
		label: __('Weight', 'prc-spoken-article'),
		description: __(
			'Relative selection weight (1–10). Higher values are chosen more often.',
			'prc-spoken-article'
		),
		isValid: { min: 1, max: 10 },
	},
	{
		id: 'voiceId',
		type: 'text',
		label: __('Voice', 'prc-spoken-article'),
		Edit: VoicePickerEdit,
	},
	{
		id: 'text',
		type: 'textarea',
		label: __('Ad Copy / Transcript', 'prc-spoken-article'),
		Edit: { control: 'textarea', rows: 6 },
		setValue: ({ value }) => ({
			text: value,
			textIsDraft: true,
		}),
	},
	{
		id: TEXT_CHAR_COUNT_FIELD_ID,
		type: 'text',
		label: '',
		readOnly: true,
		render: TextCharCountRender,
	},
	{
		id: AUDIO_FIELD_ID,
		type: 'text',
		label: __('Audio', 'prc-spoken-article'),
		Edit: AudioControlsEdit,
		getValue: () => undefined,
	},
];

export default function InterstitialAdForm({ adId }: InterstitialAdFormProps) {
	const ad = useSelect(
		(select) =>
			select(interstitialsStore)
				.getAds()
				.find((a: InterstitialAd) => a.id === adId) ?? null,
		[adId]
	);

	const { updateAd } = useDispatch(interstitialsStore);

	const handleChange = useCallback(
		(nextAd: Record<string, unknown>) => {
			if (!ad) {
				return;
			}

			const updates: Partial<InterstitialAd> = {};

			for (const key of Object.keys(nextAd) as (keyof InterstitialAd)[]) {
				if (
					key === 'id' ||
					key === TEXT_CHAR_COUNT_FIELD_ID ||
					key === AUDIO_FIELD_ID
				) {
					continue;
				}

				if (nextAd[key] !== ad[key]) {
					updates[key] = nextAd[key] as InterstitialAd[typeof key];
				}
			}

			if (Object.keys(updates).length > 0) {
				updateAd(adId, updates);
			}
		},
		[ad, adId, updateAd]
	);

	const formConfig = useMemo(
		() => ({
			layout: { type: 'card' as const, withHeader: false },
			fields: [
				'label',
				'isActive',
				'weight',
				'voiceId',
				'text',
				TEXT_CHAR_COUNT_FIELD_ID,
				AUDIO_FIELD_ID,
			],
		}),
		[]
	);

	if (!ad) {
		return null;
	}

	return (
		<div className="interstitial-settings__ad-form">
			<DataForm
				data={ad}
				fields={AD_FORM_FIELDS}
				form={formConfig}
				onChange={handleChange}
			/>
		</div>
	);
}
