/**
 * WordPress Dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { audio } from '@wordpress/icons';

/**
 * Internal Dependencies
 */
import './editor.scss';
import './style.scss';
import edit from './edit';

import metadata from './block.json';

const { name } = metadata;

const settings = {
	icon: audio,
	edit,
};

registerBlockType(name, { ...metadata, ...settings });
