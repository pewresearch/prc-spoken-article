/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { createBlocksFromInnerBlocksTemplate } from '@wordpress/blocks';

// core/button only allows core/buttons as a parent, so the default button is
// nested. The icon attributes come from the prc-block-library core/button
// extension.
export const DEFAULT_TEMPLATE = [
	[
		'core/buttons',
		{},
		[
			[
				'core/button',
				{
					text: __('Listen', 'prc-spoken-article'),
					tagName: 'button',
					hasIcon: true,
					iconLibrary: 'prc',
					iconName: 'headphones',
					iconPosition: 'left',
				},
			],
		],
	],
];

export function createDefaultInnerBlocks() {
	return createBlocksFromInnerBlocksTemplate(DEFAULT_TEMPLATE);
}
