import {
	Icon,
	__experimentalText as Text,
	__experimentalHeading as Heading,
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
	Card,
	Button,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { chevronDown } from '@wordpress/icons';
import { useState } from '@wordpress/element';

import type { SettingsAccordionProps } from '../types';

export default function SettingsAccordion({
	title,
	description,
	children,
	contentId,
	headingId,
	descriptionId,
}: SettingsAccordionProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Card className="interstitial-settings__accordion">
			<Button
				className="interstitial-settings__accordion-trigger"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				aria-controls={contentId}
				aria-describedby={descriptionId}
				aria-label={
					isOpen
						? sprintf(
								__(
									'Collapse %s settings',
									'prc-spoken-article'
								),
								title
						  )
						: sprintf(
								__('Expand %s settings', 'prc-spoken-article'),
								title
						  )
				}
			>
				<HStack alignment="top" justify="space-between">
					<VStack spacing={1}>
						<Heading
							className="interstitial-settings__accordion-header"
							id={headingId}
							level={3}
						>
							{title}
						</Heading>
						<Text
							className="interstitial-settings__accordion-description"
							id={descriptionId}
						>
							{description}
						</Text>
					</VStack>
					<Icon
						className={
							isOpen
								? 'interstitial-settings__accordion-chevron-up'
								: 'interstitial-settings__accordion-chevron-down'
						}
						icon={chevronDown}
					/>
				</HStack>
			</Button>
			{isOpen && (
				<div
					className="interstitial-settings__accordion-form"
					role="region"
					id={contentId}
					aria-labelledby={headingId}
				>
					{children}
				</div>
			)}
		</Card>
	);
}
