/**
 * WordPress Dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useEffect } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import { Modal, Spinner } from '@wordpress/components';
import { store as editorStore } from '@wordpress/editor';

const LOCK_NAME = 'spoken-article-generating';

export default function AudioGeneratingModal({
	userName,
	startedAt,
	isCurrentUser,
}: {
	userName: string;
	startedAt: string;
	isCurrentUser: boolean;
}) {
	const { lockPostSaving, unlockPostSaving } = useDispatch(editorStore);

	useEffect(() => {
		lockPostSaving(LOCK_NAME);
		return () => {
			unlockPostSaving(LOCK_NAME);
		};
	}, [lockPostSaving, unlockPostSaving]);

	const startDate = startedAt ? new Date(startedAt) : null;
	const timeString =
		startDate && !Number.isNaN(startDate.getTime())
			? startDate.toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit',
			  })
			: '';

	return (
		<Modal
			title={__('Generating Audio', 'prc-spoken-article')}
			isDismissible={false}
			shouldCloseOnClickOutside={false}
			shouldCloseOnEsc={false}
			onRequestClose={() => {}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 16,
					padding: '24px 16px',
					textAlign: 'center',
				}}
			>
				<Spinner />
				<p style={{ margin: 0, fontSize: '14px' }}>
					{isCurrentUser
						? __(
								'Audio is being generated — do not close the browser.',
								'prc-spoken-article'
						  )
						: sprintf(
								__(
									'%s is generating audio. Please wait until they finish.',
									'prc-spoken-article'
								),
								userName ||
									__('Another editor', 'prc-spoken-article')
						  )}
				</p>
				{timeString && (
					<p
						style={{
							margin: 0,
							fontSize: '12px',
							color: '#757575',
						}}
					>
						{sprintf(
							__('Started at %s', 'prc-spoken-article'),
							timeString
						)}
					</p>
				)}
			</div>
		</Modal>
	);
}
