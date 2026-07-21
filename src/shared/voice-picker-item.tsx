import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';

import type { ElevenLabsVoice } from './voice-types';
import { formatVoiceMeta } from './voice-types';

interface VoicePickerItemProps {
	voice: ElevenLabsVoice;
	isSelected: boolean;
	isPlaying: boolean;
	onSelect: (voice: ElevenLabsVoice) => void;
	onPreview: (voice: ElevenLabsVoice) => void;
}

export default function VoicePickerItem({
	voice,
	isSelected,
	isPlaying,
	onSelect,
	onPreview,
}: VoicePickerItemProps) {
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
			onClick={() => onSelect(voice)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onSelect(voice);
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
						onPreview(voice);
					}}
					label={
						isPlaying
							? __('Stop preview', 'prc-spoken-article')
							: __('Preview voice', 'prc-spoken-article')
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
				{(voice.category || voice.labels) && (
					<div
						style={{
							fontSize: 11,
							color: '#757575',
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						}}
					>
						{formatVoiceMeta(voice)}
					</div>
				)}
			</div>
		</div>
	);
}
