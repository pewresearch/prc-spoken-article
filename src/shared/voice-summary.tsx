import type { ElevenLabsVoice } from './voice-types';
import { formatVoiceMeta } from './voice-types';

interface VoiceSummaryProps {
	voice: ElevenLabsVoice;
	className?: string;
}

export default function VoiceSummary({ voice, className }: VoiceSummaryProps) {
	const meta = formatVoiceMeta(voice);
	const rootClassName = className
		? `voice-summary ${className}`
		: 'voice-summary';

	return (
		<div className={rootClassName}>
			<div className="voice-summary__name">{voice.name}</div>
			{meta && <div className="voice-summary__meta">{meta}</div>}
		</div>
	);
}
