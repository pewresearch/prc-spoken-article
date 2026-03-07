/**
 * WordPress Dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';

export default function save() {
	return (
		<button {...useBlockProps.save()} aria-label="Listen to this article">
			<span
				className="prc-icon-placeholder"
				data-icon="solid/headphones"
			/>
			<span className="spoken-article-trigger__duration" />
		</button>
	);
}
