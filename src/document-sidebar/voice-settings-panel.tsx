import VoicePicker from '../shared/voice-picker';

interface VoiceSettingsPanelProps {
	voiceId: string;
	onVoiceChange: (voiceId: string) => void;
}

export default function VoiceSettingsPanel({
	voiceId,
	onVoiceChange,
}: VoiceSettingsPanelProps) {
	return <VoicePicker selectedId={voiceId} onSelect={onVoiceChange} />;
}
