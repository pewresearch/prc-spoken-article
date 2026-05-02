import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Spinner,
	Notice,
	__experimentalVStack as VStack,
	__experimentalHeading as Heading,
	__experimentalText as Text,
} from '@wordpress/components';

import './style.scss';
import './store';
import { fetchInterstitials } from './api';
import SettingsAccordion from './components/settings-accordion';
import GeneralSettingsSection from './components/general-settings-section';
import InterstitialAdsSection from './components/interstitial-ads-section';
import type { SettingsAccordionItem } from './types';

const SETTINGS_SECTIONS: SettingsAccordionItem[] = [
	{
		title: __('General Settings', 'prc-spoken-article'),
		description: __(
			'Configure the player display label shown when an interstitial plays.',
			'prc-spoken-article'
		),
		slug: 'general-settings',
	},
	{
		title: __('Interstitial Ads', 'prc-spoken-article'),
		description: __(
			'Manage audio ads that play between spoken article sections. Active ads are selected by weighted random.',
			'prc-spoken-article'
		),
		slug: 'interstitial-ads',
	},
];

function getSectionComponent(slug: string) {
	switch (slug) {
		case 'general-settings':
			return <GeneralSettingsSection />;
		case 'interstitial-ads':
			return <InterstitialAdsSection />;
		default:
			return null;
	}
}

export default function InterstitialAdminApp() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchInterstitials()
			.then(() => setError(null))
			.catch((e: Error) => setError(e.message))
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="interstitial-settings">
			{error && (
				<Notice status="error" isDismissible={false}>
					<VStack spacing={2}>
						<span>
							{__(
								'Error loading settings:',
								'prc-spoken-article'
							)}{' '}
							{error}
						</span>
						<span>
							{__(
								'Please try again. If the problem persists, contact support.',
								'prc-spoken-article'
							)}
						</span>
					</VStack>
				</Notice>
			)}
			<VStack spacing={2} className="interstitial-settings__header">
				<Heading level={1}>
					{__('Spoken Article Interstitials', 'prc-spoken-article')}
				</Heading>
				<Text className="interstitial-settings__header-description">
					{__(
						'Manage audio interstitials that play between spoken article sections.',
						'prc-spoken-article'
					)}
				</Text>
			</VStack>
			{loading ? (
				<div className="interstitial-settings__loading">
					<Spinner />
				</div>
			) : (
				!error && (
					<VStack
						spacing={4}
						className="interstitial-settings__content"
					>
						{/* eslint-disable jsx-a11y/no-redundant-roles */}
						<ul className="interstitial-settings__list" role="list">
							{SETTINGS_SECTIONS.map((section) => {
								const contentId = `interstitial-settings-${section.slug}`;
								const headingId = `interstitial-settings-${section.slug}-heading`;
								const descriptionId = `interstitial-settings-${section.slug}-description`;

								return (
									<li
										key={section.slug}
										className="interstitial-settings__list-item"
									>
										<SettingsAccordion
											title={section.title}
											description={section.description}
											contentId={contentId}
											headingId={headingId}
											descriptionId={descriptionId}
										>
											{getSectionComponent(section.slug)}
										</SettingsAccordion>
									</li>
								);
							})}
						</ul>
						{/* eslint-enable jsx-a11y/no-redundant-roles */}
					</VStack>
				)
			)}
		</div>
	);
}
