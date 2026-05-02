/**
 * WordPress Dependencies
 */
import { useCallback } from '@wordpress/element';
import { select } from '@wordpress/data';

declare global {
	interface Window {
		PRCSpokenArticleConfig?: {
			userId?: number;
			userName?: string;
		};
	}
}

export interface GeneratingLockMeta {
	active: boolean;
	userId: number;
	userName: string;
	startedAt: string;
}

const LOCK_STALE_MS = 10 * 60 * 1000;

export function isGeneratingLockStale(startedAt: string): boolean {
	if (!startedAt) {
		return true;
	}
	const t = new Date(startedAt).getTime();
	if (Number.isNaN(t)) {
		return true;
	}
	return Date.now() - t > LOCK_STALE_MS;
}

/** Cleared lock value for `spoken_article_generating` meta. */
export function emptyGeneratingLock(): GeneratingLockMeta {
	return {
		active: false,
		userId: 0,
		userName: '',
		startedAt: '',
	};
}

/**
 * Latest edited post meta from the editor store (avoids stale closure over meta).
 */
export function getEditedPostMeta(): MetaRecord {
	const meta = (
		select('core/editor') as {
			getEditedPostAttribute: (attr: string) => MetaRecord | undefined;
		}
	).getEditedPostAttribute('meta');
	return meta ?? {};
}

interface MetaRecord {
	spoken_article_generating?: GeneratingLockMeta;
	[key: string]: unknown;
}

/**
 * RTC-visible generation lock: reads `spoken_article_generating` meta and
 * exposes setGeneratingLock for ElevenLabs flows.
 *
 * @param meta    Current post meta from useEntityProp.
 * @param setMeta Entity meta setter from useEntityProp.
 */
export function useSpokenArticleGeneratingLock(
	meta: MetaRecord | undefined,
	setMeta: (next: MetaRecord) => void
): {
	isRemoteLocked: boolean;
	remoteUserName: string;
	setGeneratingLock: (active: boolean) => void;
} {
	const currentUserId = window.PRCSpokenArticleConfig?.userId ?? 0;
	const generatingMeta: GeneratingLockMeta =
		meta?.spoken_article_generating ?? emptyGeneratingLock();
	const lockStale = isGeneratingLockStale(generatingMeta.startedAt);
	const isRemoteLocked =
		generatingMeta.active &&
		generatingMeta.userId !== 0 &&
		generatingMeta.userId !== currentUserId &&
		!lockStale;
	const remoteUserName = generatingMeta.userName || '';

	const setGeneratingLock = useCallback(
		(active: boolean) => {
			const m = getEditedPostMeta();
			const cfg = window.PRCSpokenArticleConfig;
			const uid = cfg?.userId ?? 0;
			const uname = cfg?.userName ?? '';
			setMeta({
				...m,
				spoken_article_generating: active
					? {
							active: true,
							userId: uid,
							userName: uname,
							startedAt: new Date().toISOString(),
					  }
					: emptyGeneratingLock(),
			});
		},
		[setMeta]
	);

	return { isRemoteLocked, remoteUserName, setGeneratingLock };
}
