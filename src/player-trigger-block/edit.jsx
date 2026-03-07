/**
 * External dependencies
 */
import { Icon } from '@prc/icons';

/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';

export default function Edit() {
	const blockProps = useBlockProps();

	const postType = useSelect(
		(select) => select(editorStore).getCurrentPostType(),
		[]
	);

	const [meta] = useEntityProp('postType', postType, 'meta');
	const spokenArticle = meta?.spoken_article;
	const hasAudio = spokenArticle?.attachment_id && spokenArticle?.audio_url;

	return (
		<button
			{...blockProps}
			aria-label={__('Listen to this article', 'prc-spoken-article')}
		>
			<Icon icon="headphones" library="solid" />
			<span
				className="spoken-article-trigger__duration"
				style={!hasAudio ? { opacity: 0.4 } : undefined}
			>
				{hasAudio
					? spokenArticle.duration ||
						__('Audio ready', 'prc-spoken-article')
					: __('— min', 'prc-spoken-article')}
			</span>
		</button>
	);
}
