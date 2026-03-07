/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, Warning } from '@wordpress/block-editor';
import { Flex, FlexBlock, FlexItem } from '@wordpress/components';
import { Icon, audio } from '@wordpress/icons';

export default function Edit() {
	const blockProps = useBlockProps();

	return (
		<div {...blockProps}>
			<Warning>
				<Flex>
					<FlexBlock style={{ minWidth: '20px' }}>
						<Icon icon={audio} />
					</FlexBlock>
					<FlexItem>
						{__('Spoken Article Player', 'prc-spoken-article')}
					</FlexItem>
				</Flex>
			</Warning>
		</div>
	);
}
