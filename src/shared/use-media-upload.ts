/**
 * WordPress Dependencies
 */
import { __ } from '@wordpress/i18n';
import { useCallback } from '@wordpress/element';

export interface MediaAudioSelection {
	attachmentId: number;
	audioUrl: string;
	duration: string;
}

interface WpMediaFrame {
	on: (event: string, handler: () => void) => void;
	open: () => void;
	state: () => {
		get: (key: string) => {
			first: () => { toJSON: () => Record<string, unknown> } | undefined;
		};
	};
}

interface WpMediaFn {
	(options: {
		title?: string;
		library?: { type?: string };
		multiple?: boolean;
	}): WpMediaFrame;
}

function getDurationFromAttachmentJson(
	attachment: Record<string, unknown>
): string {
	const meta = attachment.meta as Record<string, unknown> | undefined;
	if (meta && typeof meta.length_formatted === 'string') {
		return meta.length_formatted;
	}
	if (typeof attachment.fileLength === 'string') {
		return attachment.fileLength;
	}
	return '';
}

function getWpMedia(): WpMediaFn | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}
	const wp = (window as Window & { wp?: { media?: WpMediaFn } }).wp;
	return wp?.media;
}

/**
 * Opens the WordPress media modal filtered to audio; requires `wp_enqueue_media()` (admin)
 * or editor scripts (sidebar).
 */
export function useMediaAudioUpload(): {
	openAudioLibrary: (opts: {
		onSelect: (selection: MediaAudioSelection) => void;
		title?: string;
	}) => void;
} {
	const openAudioLibrary = useCallback(
		({
			onSelect,
			title,
		}: {
			onSelect: (selection: MediaAudioSelection) => void;
			title?: string;
		}) => {
			const media = getWpMedia();
			if (!media) {
				return;
			}

			const frame = media({
				title: title ?? __('Select audio', 'prc-spoken-article'),
				library: { type: 'audio' },
				multiple: false,
			});

			frame.on('select', () => {
				const attachment = frame
					.state()
					.get('selection')
					.first()
					?.toJSON();

				if (!attachment) {
					return;
				}

				const id = attachment.id;
				const url = attachment.url;

				if (typeof id !== 'number' || typeof url !== 'string') {
					return;
				}

				onSelect({
					attachmentId: id,
					audioUrl: url,
					duration: getDurationFromAttachmentJson(attachment),
				});
			});

			frame.open();
		},
		[]
	);

	return { openAudioLibrary };
}
