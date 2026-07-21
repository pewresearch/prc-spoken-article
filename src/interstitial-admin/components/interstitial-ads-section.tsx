import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button,
	Icon,
	TextControl,
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
	__experimentalText as Text,
} from '@wordpress/components';
import { chevronDown } from '@wordpress/icons';
import { useSelect, useDispatch } from '@wordpress/data';
import { SettingsSectionFooter } from '@prc/components';

import { store as interstitialsStore } from '../store';
import { saveInterstitials } from '../api';
import InterstitialAdForm from './interstitial-ad-form';
import type { InterstitialAd } from '../types';

function generateId(): string {
	return crypto.randomUUID();
}

function emptyAd(): InterstitialAd {
	return {
		id: generateId(),
		label: '',
		text: '',
		textIsDraft: true,
		audioUrl: '',
		attachmentId: 0,
		duration: '',
		voiceId: '',
		weight: 5,
		isActive: false,
	};
}

export default function InterstitialAdsSection() {
	const ads = useSelect((select) => select(interstitialsStore).getAds(), []);
	const playerLabel = useSelect(
		(select) => select(interstitialsStore).getSettings().label,
		[]
	);
	const { addAd, deleteAd, applyPatch } = useDispatch(interstitialsStore);

	const [openAdId, setOpenAdId] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const handleAddNew = () => {
		const ad = emptyAd();
		addAd(ad);
		setOpenAdId(ad.id);
	};

	const handleSaveAll = async () => {
		setIsSaving(true);
		setSaveError(null);
		try {
			await saveInterstitials();
		} catch (error) {
			setSaveError(
				error instanceof Error
					? error.message
					: __(
							'Failed to save interstitial settings.',
							'prc-spoken-article'
						)
			);
		} finally {
			setIsSaving(false);
		}
	};

	const toggleAd = (id: string) => {
		setOpenAdId((current) => (current === id ? null : id));
	};

	return (
		<VStack spacing={4} className="interstitial-settings__section-content">
			<div className="interstitial-settings__player-label">
				<TextControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={__('Player Display Label', 'prc-spoken-article')}
					help={__(
						'Shown in the audio player when an interstitial plays.',
						'prc-spoken-article'
					)}
					value={playerLabel}
					onChange={(label) => applyPatch({ label })}
				/>
			</div>

			{ads.length === 0 ? (
				<Text className="interstitial-settings__empty" variant="muted">
					{__(
						'No interstitial ads yet. Click "Add New" to create one.',
						'prc-spoken-article'
					)}
				</Text>
			) : (
				<ul className="interstitial-settings__ads-list">
					{ads.map((ad: InterstitialAd) => {
						const isOpen = openAdId === ad.id;
						const contentId = `interstitial-ad-${ad.id}-content`;
						const headingId = `interstitial-ad-${ad.id}-heading`;

						return (
							<li
								key={ad.id}
								className="interstitial-settings__ads-list-item"
							>
								<div className="interstitial-settings__sub-section">
									<Button
										className="interstitial-settings__sub-section-trigger"
										onClick={() => toggleAd(ad.id)}
										aria-expanded={isOpen}
										aria-controls={contentId}
									>
										<HStack
											alignment="center"
											justify="space-between"
										>
											<div style={{ flexGrow: 1 }}>
												<Text
													id={headingId}
													weight={600}
												>
													{ad.label ||
														__(
															'Untitled Ad',
															'prc-spoken-article'
														)}
												</Text>
											</div>
											<div>
												<HStack spacing={2}>
													<span
														className={`interstitial-settings__ad-badge interstitial-settings__ad-badge--${
															ad.isActive
																? 'active'
																: 'inactive'
														}`}
													>
														{ad.isActive
															? __(
																	'Active',
																	'prc-spoken-article'
																)
															: __(
																	'Inactive',
																	'prc-spoken-article'
																)}
													</span>
													<Button
														variant="tertiary"
														isDestructive
														size="small"
														onClick={(e) => {
															e.stopPropagation();
															deleteAd(ad.id);
															if (
																openAdId ===
																ad.id
															) {
																setOpenAdId(
																	null
																);
															}
														}}
													>
														{__(
															'Delete',
															'prc-spoken-article'
														)}
													</Button>
													<Icon
														className={
															isOpen
																? 'interstitial-settings__sub-section-chevron-up'
																: 'interstitial-settings__sub-section-chevron-down'
														}
														icon={chevronDown}
													/>
												</HStack>
											</div>
										</HStack>
									</Button>
									{isOpen && (
										<div
											className="interstitial-settings__sub-section-content"
											id={contentId}
											role="region"
											aria-labelledby={headingId}
										>
											<InterstitialAdForm adId={ad.id} />
										</div>
									)}
								</div>
							</li>
						);
					})}
				</ul>
			)}

			<div className="interstitial-settings__ads-actions">
				<HStack spacing={3} justify="flex-start">
					<Button variant="secondary" onClick={handleAddNew}>
						{__('Add New Interstitial', 'prc-spoken-article')}
					</Button>
				</HStack>
				<SettingsSectionFooter
					saveLabel={__('Save All', 'prc-spoken-article')}
					savingLabel={__('Saving…', 'prc-spoken-article')}
					isBusy={isSaving}
					error={saveError}
					onDismissError={() => setSaveError(null)}
					onSave={handleSaveAll}
				/>
			</div>
		</VStack>
	);
}
