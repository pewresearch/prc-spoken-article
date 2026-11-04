/**
 * WordPress Dependencies
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

/**
 * Internal Dependencies
 */
import { DEFAULT_TEMPLATE } from './template';

export default function Edit() {
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		template: DEFAULT_TEMPLATE,
		templateLock: false,
	});

	return <div {...innerBlocksProps} />;
}
