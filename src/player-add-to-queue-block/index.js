/**
 * External Dependencies
 */
import { Icon } from '@prc/icons';

/**
 * WordPress Dependencies
 */
import { useState, useEffect, useRef } from '@wordpress/element';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';

/**
 * Internal Dependencies
 */
import './style.scss';
import metadata from './block.json';
import save from './save';

const TOAST_DURATION = 2000;

function Edit() {
	const blockProps = useBlockProps();
	const [toastKey, setToastKey] = useState(null);
	const timerRef = useRef(null);

	function handleClick() {
		clearTimeout(timerRef.current);
		setToastKey(Date.now());
		timerRef.current = setTimeout(() => setToastKey(null), TOAST_DURATION);
	}

	useEffect(() => () => clearTimeout(timerRef.current), []);

	return (
		<button {...blockProps} onClick={handleClick} aria-label="Add to queue">
			<Icon icon="list" library="solid" />
			{toastKey !== null && (
				<span key={toastKey} className="player-add-to-queue__toast">
					Added to queue
				</span>
			)}
		</button>
	);
}

const deprecated = [
	{
		save() {
			return (
				<div
					{...useBlockProps.save({
						'data-wp-interactive': JSON.stringify({
							namespace: 'prc-spoken-article/player',
						}),
					})}
				>
					<span className="player-add-to-queue__wrap">
						<button
							className="player-add-to-queue__btn"
							data-wp-on--click="actions.addToQueue"
							aria-label="Add to queue"
						>
							<span
								className="prc-icon-placeholder"
								data-icon="solid/list"
							/>
						</button>
						<span
							className="player-add-to-queue__toast"
							data-wp-bind--hidden="!state.queueAddedToast"
							data-wp-text="state.queueAddedToast"
							role="status"
							aria-live="polite"
							hidden
						/>
					</span>
				</div>
			);
		},
	},
	{ save: () => null },
];

registerBlockType(metadata.name, {
	edit: Edit,
	save,
	deprecated,
});
