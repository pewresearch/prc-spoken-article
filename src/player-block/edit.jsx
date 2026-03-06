/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';

export default function Edit() {
	const blockProps = useBlockProps({
		className: 'spoken-article-player-editor',
	});

	return (
		<div {...blockProps}>
			<div className="spoken-article-player-editor__placeholder">
				<span className="spoken-article-player-editor__label">
					{__(
						'Spoken Article Player — place in footer template',
						'prc-spoken-article'
					)}
				</span>
			</div>
		</div>
	);
}
