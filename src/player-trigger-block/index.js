/**
 * WordPress Dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import { audio } from '@wordpress/icons';

/**
 * Internal Dependencies
 */
import './editor.scss';
import './style.scss';
import edit from './edit';
import save from './save';

import metadata from './block.json';

const { name } = metadata;

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
					<button
						className="spoken-article-trigger"
						data-wp-on--click="actions.requestPlay"
						aria-label="Listen to this article"
					>
						<span
							className="prc-icon-placeholder"
							data-icon="solid/headphones"
						/>
						<span
							className="spoken-article-trigger__duration"
							data-wp-text="context.duration"
						/>
					</button>
				</div>
			);
		},
	},
	{ save: () => null },
];

const settings = {
	icon: audio,
	edit,
	save,
	deprecated,
};

registerBlockType(name, { ...metadata, ...settings });
