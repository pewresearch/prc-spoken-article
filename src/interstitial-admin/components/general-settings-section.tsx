import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	TextControl,
	Button,
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';

import { store as interstitialsStore } from '../store';
import { saveInterstitials } from '../api';

export default function GeneralSettingsSection() {
	const label = useSelect(
		(select) => select(interstitialsStore).getLabel(),
		[]
	);
	const { updateLabel } = useDispatch(interstitialsStore);

	const [draft, setDraft] = useState(label);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setDraft(label);
	}, [label]);

	const handleSave = async () => {
		setIsSaving(true);
		updateLabel(draft);
		await saveInterstitials();
		setIsSaving(false);
	};

	return (
		<VStack spacing={4} className="interstitial-settings__section-content">
			<TextControl
				__nextHasNoMarginBottom
				label={__('Player Display Label', 'prc-spoken-article')}
				help={__(
					'Shown in the audio player when an interstitial plays.',
					'prc-spoken-article'
				)}
				value={draft}
				onChange={setDraft}
			/>
			<HStack justify="flex-start">
				<Button
					variant="primary"
					onClick={handleSave}
					isBusy={isSaving}
					disabled={isSaving}
				>
					{__('Save Label', 'prc-spoken-article')}
				</Button>
			</HStack>
		</VStack>
	);
}
