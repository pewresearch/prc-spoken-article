/**
 * WordPress Dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';

export default function save() {
	return (
		<button {...useBlockProps.save()} aria-label="Add to queue">
			<span className="prc-icon-placeholder" data-icon="solid/list" />
			<span
				className="player-add-to-queue__toast"
				role="status"
				aria-live="polite"
				hidden
			/>
		</button>
	);
}
