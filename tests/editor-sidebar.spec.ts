/**
 * Editor Sidebar Panel Tests — prc-spoken-article
 *
 * Covers the Spoken Article sidebar panel registered via class-wp-admin.php
 * and rendered by src/sidebar/sidebar-panel.tsx.
 *
 * Panels under test:
 *   - "Audio Status" — shows audio player or a "no audio" notice
 *   - "Play Count"   — displays the current play count
 *   - "Voice"        — voice picker section
 *   - "AI Generation"— AI generation controls
 *   - "Transcript"   — appears only when spoken_article_transcript is set
 */

import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

async function deletePost(
	requestUtils: RequestUtils,
	postId: number
): Promise<void> {
	await requestUtils.rest( {
		method: 'DELETE',
		path: `/wp/v2/posts/${ postId }`,
		params: { force: true },
	} );
}

// ---------------------------------------------------------------------------
// Helper: open the Spoken Article sidebar panel in the block editor.
// The sidebar is registered via plugin-sidebar so it may require clicking
// the plugin sidebar button in the toolbar.
// ---------------------------------------------------------------------------
async function openSpokenArticleSidebar( { admin, page, editor } ) {
	await editor.openDocumentSettingsSidebar();

	// Look for a "Spoken Article" tab / plugin sidebar button in the toolbar.
	const pluginSidebarBtn = page.getByRole( 'button', {
		name: /spoken article/i,
	} );

	if ( await pluginSidebarBtn.isVisible() ) {
		await pluginSidebarBtn.click();
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe( 'Spoken Article Editor Sidebar', () => {
	test.describe( 'Audio Status panel — no audio', () => {
		test( 'shows "no audio" notice when spoken_article meta is empty', async ( {
			admin,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: 'Sidebar No Audio Test',
				status: 'draft',
			} );

			try {
				await admin.visitAdminPage(
					'post.php',
					`post=${ post.id }&action=edit`
				);

				await openSpokenArticleSidebar( { admin, page, editor } );

				// The "Audio Status" PanelBody should be visible.
				await expect(
					page.getByRole( 'heading', { name: /audio status/i } )
				).toBeVisible();

				// The info notice about no audio should be present.
				await expect(
					page.getByText(
						/no spoken article audio has been generated/i
					)
				).toBeVisible();
			} finally {
				await deletePost( requestUtils, post.id );
			}
		} );
	} );

	test.describe( 'Audio Status panel — with audio', () => {
		test( 'shows audio player and duration when spoken_article meta is populated', async ( {
			admin,
			editor,
			page,
			requestUtils,
		} ) => {
			// Create a post and set spoken_article meta directly via REST.
			const post = await requestUtils.createPost( {
				title: 'Sidebar With Audio Test',
				status: 'draft',
				meta: {
					spoken_article: {
						attachment_id: 999,
						audio_url: 'https://example.com/test-audio.mp3',
						duration: '4:32',
					},
				},
			} );

			try {
				await admin.visitAdminPage(
					'post.php',
					`post=${ post.id }&action=edit`
				);

				await openSpokenArticleSidebar( { admin, page, editor } );

				// Duration label should appear.
				await expect(
					page.getByText( /duration:/i )
				).toBeVisible();

				// An <audio> element should be rendered.
				await expect( page.locator( 'audio[controls]' ) ).toBeVisible();

				// "Remove Audio" button should be present.
				await expect(
					page.getByRole( 'button', { name: /remove audio/i } )
				).toBeVisible();
			} finally {
				await deletePost( requestUtils, post.id );
			}
		} );

		test( '"Remove Audio" button clears spoken_article meta', async ( {
			admin,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: 'Remove Audio Test',
				status: 'draft',
				meta: {
					spoken_article: {
						attachment_id: 999,
						audio_url: 'https://example.com/test-audio.mp3',
						duration: '2:00',
					},
				},
			} );

			try {
				await admin.visitAdminPage(
					'post.php',
					`post=${ post.id }&action=edit`
				);

				await openSpokenArticleSidebar( { admin, page, editor } );

				await page
					.getByRole( 'button', { name: /remove audio/i } )
					.click();

				// After clicking Remove Audio, the "no audio" notice should appear.
				await expect(
					page.getByText(
						/no spoken article audio has been generated/i
					)
				).toBeVisible();
			} finally {
				await deletePost( requestUtils, post.id );
			}
		} );
	} );

	test.describe( 'Play Count panel', () => {
		test( 'shows play count of 0 for a new post', async ( {
			admin,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: 'Play Count Zero Test',
				status: 'draft',
			} );

			try {
				await admin.visitAdminPage(
					'post.php',
					`post=${ post.id }&action=edit`
				);

				await openSpokenArticleSidebar( { admin, page, editor } );

				await expect(
					page.getByRole( 'heading', { name: /play count/i } )
				).toBeVisible();

				// Total plays should show 0.
				await expect( page.getByText( /total plays:/i ) ).toBeVisible();
				const strong = page
					.locator( 'strong' )
					.filter( { hasText: '0' } );
				await expect( strong ).toBeVisible();
			} finally {
				await deletePost( requestUtils, post.id );
			}
		} );

		test( 'reflects an incremented play count in the sidebar', async ( {
			admin,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: 'Play Count Increment Test',
				status: 'publish',
			} );

			try {
				// Increment via REST.
				await requestUtils.rest( {
					method: 'POST',
					path: `/prc-spoken-article/v1/play-count/${ post.id }`,
				} );
				await requestUtils.rest( {
					method: 'POST',
					path: `/prc-spoken-article/v1/play-count/${ post.id }`,
				} );

				await admin.visitAdminPage(
					'post.php',
					`post=${ post.id }&action=edit`
				);

				await openSpokenArticleSidebar( { admin, page, editor } );

				// The strong element for play count should now show 2.
				const strong = page
					.locator( 'strong' )
					.filter( { hasText: '2' } );
				await expect( strong ).toBeVisible();
			} finally {
				await deletePost( requestUtils, post.id );
			}
		} );
	} );

	test.describe( 'Voice panel', () => {
		test( 'Voice panel heading is present in the sidebar', async ( {
			admin,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: 'Voice Panel Test',
				status: 'draft',
			} );

			try {
				await admin.visitAdminPage(
					'post.php',
					`post=${ post.id }&action=edit`
				);

				await openSpokenArticleSidebar( { admin, page, editor } );

				await expect(
					page.getByRole( 'heading', { name: /^voice$/i } )
				).toBeVisible();
			} finally {
				await deletePost( requestUtils, post.id );
			}
		} );
	} );

	test.describe( 'AI Generation panel', () => {
		test( 'AI Generation panel is open by default when no audio exists', async ( {
			admin,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: 'AI Generation Panel Test',
				status: 'draft',
			} );

			try {
				await admin.visitAdminPage(
					'post.php',
					`post=${ post.id }&action=edit`
				);

				await openSpokenArticleSidebar( { admin, page, editor } );

				await expect(
					page.getByRole( 'heading', { name: /ai generation/i } )
				).toBeVisible();
			} finally {
				await deletePost( requestUtils, post.id );
			}
		} );
	} );

	test.describe( 'Transcript panel', () => {
		test( 'Transcript panel is hidden when no transcript meta is set', async ( {
			admin,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: 'No Transcript Test',
				status: 'draft',
			} );

			try {
				await admin.visitAdminPage(
					'post.php',
					`post=${ post.id }&action=edit`
				);

				await openSpokenArticleSidebar( { admin, page, editor } );

				// The Transcript heading should NOT be present.
				await expect(
					page.getByRole( 'heading', { name: /^transcript$/i } )
				).not.toBeVisible();
			} finally {
				await deletePost( requestUtils, post.id );
			}
		} );

		test( 'Transcript panel appears and shows draft warning when transcript_is_draft is true', async ( {
			admin,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: 'Draft Transcript Test',
				status: 'draft',
				meta: {
					spoken_article_transcript:
						'This is a draft transcript for the spoken article.',
					spoken_article_transcript_is_draft: true,
				},
			} );

			try {
				await admin.visitAdminPage(
					'post.php',
					`post=${ post.id }&action=edit`
				);

				await openSpokenArticleSidebar( { admin, page, editor } );

				// Transcript panel should be visible.
				await expect(
					page.getByRole( 'heading', { name: /^transcript$/i } )
				).toBeVisible();

				// Draft warning notice.
				await expect(
					page.getByText( /draft transcript/i )
				).toBeVisible();

				// Textarea should be enabled for editing when transcript is a draft.
				const textarea = page.locator( 'textarea' ).first();
				await expect( textarea ).not.toBeDisabled();
			} finally {
				await deletePost( requestUtils, post.id );
			}
		} );

		test( 'Transcript textarea is read-only when transcript_is_draft is false', async ( {
			admin,
			editor,
			page,
			requestUtils,
		} ) => {
			const post = await requestUtils.createPost( {
				title: 'Published Transcript Test',
				status: 'draft',
				meta: {
					spoken_article_transcript:
						'This transcript was used for audio generation.',
					spoken_article_transcript_is_draft: false,
				},
			} );

			try {
				await admin.visitAdminPage(
					'post.php',
					`post=${ post.id }&action=edit`
				);

				await openSpokenArticleSidebar( { admin, page, editor } );

				await expect(
					page.getByRole( 'heading', { name: /^transcript$/i } )
				).toBeVisible();

				// Success notice when transcript is not a draft.
				await expect(
					page.getByText( /transcript used for the current audio/i )
				).toBeVisible();

				// Textarea should be disabled when transcript is not a draft.
				const textarea = page.locator( 'textarea' ).first();
				await expect( textarea ).toBeDisabled();
			} finally {
				await deletePost( requestUtils, post.id );
			}
		} );

		test( 'character count is displayed in Transcript panel', async ( {
			admin,
			editor,
			page,
			requestUtils,
		} ) => {
			const transcriptText = 'Hello world, this is a test transcript.';
			const post = await requestUtils.createPost( {
				title: 'Transcript Char Count Test',
				status: 'draft',
				meta: {
					spoken_article_transcript: transcriptText,
					spoken_article_transcript_is_draft: true,
				},
			} );

			try {
				await admin.visitAdminPage(
					'post.php',
					`post=${ post.id }&action=edit`
				);

				await openSpokenArticleSidebar( { admin, page, editor } );

				// Should display the character count.
				await expect(
					page.getByText( /characters:/i )
				).toBeVisible();
				await expect(
					page.getByText( String( transcriptText.length ) )
				).toBeVisible();
			} finally {
				await deletePost( requestUtils, post.id );
			}
		} );
	} );
} );
