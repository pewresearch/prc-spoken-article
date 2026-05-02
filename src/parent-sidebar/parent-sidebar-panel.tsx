/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';
import { store as editorStore } from '@wordpress/editor';
import {
	PanelBody,
	PanelRow,
	Button,
	Notice,
	Spinner,
	ToggleControl,
	ExternalLink,
} from '@wordpress/components';

/**
 * Internal Dependencies
 */
import { useSpokenArticleData } from './use-spoken-article-data';

export default function ParentSidebarPanel() {
	const { postType, postId } = useSelect((select) => {
		const editor = select(editorStore) as {
			getCurrentPostType: () => string;
			getCurrentPostId: () => number;
		};
		return {
			postType: editor.getCurrentPostType(),
			postId: editor.getCurrentPostId(),
		};
	}, []);

	const [meta, setMeta] = useEntityProp('postType', postType, 'meta');
	const playerEnabled: boolean = meta?.spoken_article_player_enabled ?? true;

	const {
		data: spokenArticleData,
		isLoading,
		isCreating,
		isDeleting,
		create,
		remove,
	} = useSpokenArticleData(postId);

	const handleTogglePlayer = (enabled: boolean) => {
		setMeta({ ...meta, spoken_article_player_enabled: enabled });
	};

	const hasAudio = !!(
		spokenArticleData?.exists &&
		spokenArticleData?.audio?.attachment_id &&
		spokenArticleData?.audio?.audio_url
	);

	if (isLoading) {
		return (
			<PanelBody
				title={__('Spoken Article', 'prc-spoken-article')}
				initialOpen={true}
			>
				<PanelRow>
					<Spinner />
				</PanelRow>
			</PanelBody>
		);
	}

	return (
		<>
			<PanelBody
				title={__('Audio Status', 'prc-spoken-article')}
				initialOpen={true}
			>
				<AudioStatusContent
					hasAudio={hasAudio}
					spokenArticleData={spokenArticleData}
				/>
			</PanelBody>

			<PanelBody
				title={__('Player Settings', 'prc-spoken-article')}
				initialOpen={true}
			>
				<PanelRow>
					<ToggleControl
						__nextHasNoMarginBottom
						label={__(
							'Show player trigger on this post',
							'prc-spoken-article'
						)}
						checked={playerEnabled}
						onChange={handleTogglePlayer}
						help={
							playerEnabled
								? __(
										'The spoken article player button will appear on this post.',
										'prc-spoken-article'
								  )
								: __(
										'The spoken article player button is hidden on this post.',
										'prc-spoken-article'
								  )
						}
					/>
				</PanelRow>
			</PanelBody>

			<PanelBody
				title={__('Manage', 'prc-spoken-article')}
				initialOpen={true}
			>
				{spokenArticleData?.exists && spokenArticleData?.editUrl ? (
					<>
						<PanelRow>
							<ExternalLink href={spokenArticleData.editUrl}>
								{__(
									'Edit Spoken Article',
									'prc-spoken-article'
								)}
							</ExternalLink>
						</PanelRow>
						<PanelRow>
							<Button
								variant="secondary"
								isDestructive
								onClick={remove}
								isBusy={isDeleting}
								disabled={isDeleting}
								size="small"
							>
								{isDeleting
									? __('Deleting…', 'prc-spoken-article')
									: __(
											'Delete Spoken Article',
											'prc-spoken-article'
									  )}
							</Button>
						</PanelRow>
					</>
				) : (
					<PanelRow>
						<Button
							variant="primary"
							onClick={create}
							isBusy={isCreating}
							disabled={isCreating}
						>
							{isCreating
								? __(
										'Generating transcript…',
										'prc-spoken-article'
								  )
								: __(
										'Create Spoken Article',
										'prc-spoken-article'
								  )}
						</Button>
					</PanelRow>
				)}
			</PanelBody>
		</>
	);
}

function AudioStatusContent({
	hasAudio,
	spokenArticleData,
}: {
	hasAudio: boolean;
	spokenArticleData: ReturnType<typeof useSpokenArticleData>['data'];
}) {
	if (hasAudio) {
		return (
			<>
				<PanelRow>
					<div style={{ width: '100%' }}>
						<p style={{ margin: '0 0 4px', fontWeight: 600 }}>
							{__('Duration:', 'prc-spoken-article')}{' '}
							{spokenArticleData?.audio?.duration ||
								__('Unknown', 'prc-spoken-article')}
						</p>
						<audio
							controls
							preload="metadata"
							src={spokenArticleData?.audio?.audio_url}
							style={{ width: '100%', marginTop: 8 }}
						/>
					</div>
				</PanelRow>
				{typeof spokenArticleData?.playCount === 'number' && (
					<PanelRow>
						<span>{__('Total plays:', 'prc-spoken-article')}</span>
						<strong>
							{spokenArticleData.playCount.toLocaleString()}
						</strong>
					</PanelRow>
				)}
			</>
		);
	}

	if (spokenArticleData?.exists) {
		return (
			<PanelRow>
				<Notice status="info" isDismissible={false}>
					{__(
						'Spoken article exists but no audio has been generated yet.',
						'prc-spoken-article'
					)}
				</Notice>
			</PanelRow>
		);
	}

	return (
		<PanelRow>
			<Notice status="info" isDismissible={false}>
				{__(
					'No spoken article has been created for this post.',
					'prc-spoken-article'
				)}
			</Notice>
		</PanelRow>
	);
}
