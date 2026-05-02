/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	PanelRow,
	Button,
	Notice,
	TextareaControl,
	__experimentalText as Text,
} from '@wordpress/components';

interface SpokenArticleTranscriptPanelProps {
	transcript: string;
	transcriptIsDraft: boolean;
	onTranscriptChange: (value: string) => void;
}

/**
 * Transcript editor panel (shown when a transcript exists).
 *
 * @param props Panel props.
 */
export default function SpokenArticleTranscriptPanel(
	props: SpokenArticleTranscriptPanelProps
) {
	const { transcript, transcriptIsDraft, onTranscriptChange } = props;
	return (
		<PanelBody
			title={__('Transcript', 'prc-spoken-article')}
			initialOpen={transcriptIsDraft}
		>
			<PanelRow>
				<div style={{ width: '100%' }}>
					{transcriptIsDraft ? (
						<div style={{ marginBottom: '8px' }}>
							<Notice status="warning" isDismissible={false}>
								{__(
									'Draft transcript — edit below, then generate audio when ready.',
									'prc-spoken-article'
								)}
							</Notice>
						</div>
					) : (
						<div style={{ marginBottom: '8px' }}>
							<Notice status="success" isDismissible={false}>
								{__(
									'Transcript used for the current audio. Regenerate to create a new draft.',
									'prc-spoken-article'
								)}
							</Notice>
						</div>
					)}
					<Text
						variant="muted"
						style={{
							display: 'block',
							marginBottom: '4px',
						}}
					>
						{__('Characters:', 'prc-spoken-article')}{' '}
						{transcript.length.toLocaleString()}
					</Text>
					{transcriptIsDraft && (
						<Button
							variant="secondary"
							size="small"
							onClick={() =>
								window.dispatchEvent(
									new CustomEvent(
										'prc-spoken-article:refresh-from-ai'
									)
								)
							}
							style={{ marginBottom: '8px' }}
						>
							{__('Refresh from AI', 'prc-spoken-article')}
						</Button>
					)}
					<TextareaControl
						__nextHasNoMarginBottom
						label={__('Transcript', 'prc-spoken-article')}
						hideLabelFromVision
						value={transcript}
						onChange={onTranscriptChange}
						rows={12}
						disabled={!transcriptIsDraft}
						style={{ width: '100%' }}
					/>
				</div>
			</PanelRow>
		</PanelBody>
	);
}
