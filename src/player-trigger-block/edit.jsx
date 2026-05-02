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
import { store as editorStore } from '@wordpress/editor';

export default function Edit() {
	const blockProps = useBlockProps();

	const postId = useSelect(
		(select) => select(editorStore).getCurrentPostId(),
		[]
	);

	const spokenArticle = useSelect(
		(select) => {
			if (!postId) {
				return null;
			}
			const records = select('core').getEntityRecords(
				'postType',
				'spoken-article',
				{
					post_parent: postId,
					per_page: 1,
					status: ['publish', 'draft', 'pending', 'private'],
				}
			);
			return records && records.length > 0 ? records[0] : null;
		},
		[postId]
	);

	const audio = spokenArticle?.meta?.spoken_article;
	const hasAudio = audio?.attachment_id && audio?.audio_url;

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
					? audio.duration || __('Audio ready', 'prc-spoken-article')
					: __('— min', 'prc-spoken-article')}
			</span>
		</button>
	);
}
