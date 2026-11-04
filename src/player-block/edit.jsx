/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	Warning,
} from '@wordpress/block-editor';
import {
	Flex,
	FlexBlock,
	FlexItem,
	PanelBody,
	ToggleControl,
} from '@wordpress/components';
import { Icon, audio } from '@wordpress/icons';

export default function Edit({ attributes, setAttributes }) {
	const { enableQueue } = attributes;
	const blockProps = useBlockProps();

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Settings', 'prc-spoken-article')}>
					<ToggleControl
						__nextHasNoMarginBottom
						label={__('Enable queue', 'prc-spoken-article')}
						help={__(
							'When off, the player hides the Queue tab, does not play the next article, and add-to-queue buttons are hidden.',
							'prc-spoken-article'
						)}
						checked={enableQueue}
						onChange={(value) =>
							setAttributes({ enableQueue: value })
						}
					/>
				</PanelBody>
			</InspectorControls>
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
		</>
	);
}
