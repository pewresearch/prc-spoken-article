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
	const blockProps = useBlockProps({
		className: 'spoken-article-editor',
	});

	const postType = useSelect(
		(select) => select(editorStore).getCurrentPostType(),
		[]
	);

	const [meta] = useEntityProp('postType', postType, 'meta');
	const spokenArticle = meta?.spoken_article;
	const hasAudio = spokenArticle?.attachment_id && spokenArticle?.audio_url;

	return (
		<div {...blockProps}>
			<div className="spoken-article-editor__preview">
				<Icon icon="headphones" library="solid" />
				<span
					className={`spoken-article-editor__duration${
						!hasAudio
							? ' spoken-article-editor__duration--placeholder'
							: ''
					}`}
				>
					{hasAudio
						? spokenArticle.duration ||
							__('Audio ready', 'prc-spoken-article')
						: __('— min', 'prc-spoken-article')}
				</span>
			</div>
		</div>
	);
}
