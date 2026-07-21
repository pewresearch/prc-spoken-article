/**
 * WordPress Dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useEntityProp } from '@wordpress/core-data';
import {
	Button,
	Notice,
	__experimentalVStack as VStack,
	__experimentalText as Text,
} from '@wordpress/components';
import { PluginPrePublishPanel } from '@wordpress/editor';

/**
 * Internal Dependencies
 */
import { GENERATE_PRODUCTION_AUDIO_EVENT } from './ai-generate-spoken-article';
import { getModelLabelForQualityTier } from '../shared/audio-quality';

export default function SpokenArticlePrePublishPanel() {
	const [meta] = useEntityProp('postType', 'spoken-article', 'meta');
	const audioQuality: string = meta?.spoken_article_audio_quality ?? '';
	const spokenArticle = meta?.spoken_article ?? {
		attachment_id: 0,
		audio_url: '',
		duration: '',
	};
	const hasAudio = !!spokenArticle.attachment_id && !!spokenArticle.audio_url;

	// Hide when production, or when legacy audio exists without quality meta.
	if (
		audioQuality === 'production' ||
		(hasAudio && audioQuality !== 'draft')
	) {
		return null;
	}

	const productionModelLabel = getModelLabelForQualityTier('production');

	const handleGenerateProduction = () => {
		window.dispatchEvent(new CustomEvent(GENERATE_PRODUCTION_AUDIO_EVENT));
	};

	return (
		<PluginPrePublishPanel
			title={__('Spoken Article Audio', 'prc-spoken-article')}
			initialOpen
		>
			<VStack spacing={3}>
				<Notice status="warning" isDismissible={false}>
					{hasAudio
						? __(
								'The attached spoken article audio is draft quality. Generate production-quality audio before publishing.',
								'prc-spoken-article'
							)
						: __(
								'No spoken article audio has been generated yet. Generate production-quality audio before publishing.',
								'prc-spoken-article'
							)}
				</Notice>
				<Text size={12} color="#757575">
					{__(
						'You can still publish without production audio, but listeners will hear draft-quality audio until you regenerate.',
						'prc-spoken-article'
					)}{' '}
					{sprintf(
						/* translators: %s: ElevenLabs model label */
						__('Production audio uses %s.', 'prc-spoken-article'),
						productionModelLabel
					)}
				</Text>
				<Button variant="primary" onClick={handleGenerateProduction}>
					{__('Generate Production Audio', 'prc-spoken-article')}
				</Button>
			</VStack>
		</PluginPrePublishPanel>
	);
}
