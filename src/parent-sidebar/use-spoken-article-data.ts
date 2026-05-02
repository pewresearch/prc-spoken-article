/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState, useEffect, useCallback } from '@wordpress/element';

interface SpokenArticleData {
	exists: boolean;
	id: number;
	editUrl?: string;
	status?: string;
	audio?: {
		attachment_id: number;
		audio_url: string;
		duration: string;
	};
	playCount?: number;
}

interface RestConfig {
	restBase?: string;
	restNonce?: string;
}

export type { SpokenArticleData };

export function useSpokenArticleData(postId: number) {
	const [data, setData] = useState<SpokenArticleData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isCreating, setIsCreating] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const config: RestConfig | undefined = (
		window as { PRCSpokenArticleConfig?: RestConfig }
	).PRCSpokenArticleConfig;

	const fetchData = useCallback(async () => {
		if (!postId || !config?.restBase) {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		try {
			const res = await fetch(
				`${config.restBase}/spoken-article-for/${postId}`,
				{
					headers: {
						'X-WP-Nonce': config.restNonce ?? '',
						Accept: 'application/json',
					},
				}
			);
			if (res.ok) {
				setData((await res.json()) as SpokenArticleData);
			}
		} catch {
			// Silently fail — user can retry.
		} finally {
			setIsLoading(false);
		}
	}, [postId, config?.restBase, config?.restNonce]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const create = useCallback(async () => {
		if (!postId || !config?.restBase) {
			return;
		}
		setIsCreating(true);
		try {
			const res = await fetch(
				`${config.restBase}/spoken-article-for/${postId}`,
				{
					method: 'POST',
					headers: {
						'X-WP-Nonce': config.restNonce ?? '',
						'Content-Type': 'application/json',
					},
				}
			);
			if (res.ok) {
				const result = (await res.json()) as {
					id: number;
					editUrl: string;
				};
				window.open(result.editUrl, '_blank');
				await fetchData();
			}
		} catch {
			// Silently fail.
		} finally {
			setIsCreating(false);
		}
	}, [postId, config?.restBase, config?.restNonce, fetchData]);

	const remove = useCallback(async () => {
		if (!postId || !config?.restBase || !data?.exists) {
			return;
		}

		// eslint-disable-next-line no-alert
		const confirmed = window.confirm(
			__(
				'Are you sure you want to delete this spoken article? This will remove the transcript and any generated audio.',
				'prc-spoken-article'
			)
		);
		if (!confirmed) {
			return;
		}

		setIsDeleting(true);
		try {
			const res = await fetch(
				`${config.restBase}/spoken-article-for/${postId}`,
				{
					method: 'DELETE',
					headers: {
						'X-WP-Nonce': config.restNonce ?? '',
					},
				}
			);
			if (res.ok) {
				setData(null);
				await fetchData();
			}
		} catch {
			// Silently fail.
		} finally {
			setIsDeleting(false);
		}
	}, [postId, config?.restBase, config?.restNonce, data?.exists, fetchData]);

	return { data, isLoading, isCreating, isDeleting, create, remove };
}
