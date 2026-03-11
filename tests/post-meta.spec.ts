/**
 * Post Meta REST Field Tests — prc-spoken-article
 *
 * Validates that all four post meta fields registered in class-post-meta.php
 * are correctly exposed via the WP REST API on the standard posts endpoint:
 *
 *   spoken_article              (object)  — attachment_id, audio_url, duration
 *   spoken_article_play_count   (integer) — read/write via REST
 *   spoken_article_transcript   (string)  — readable/writable via REST
 *   spoken_article_transcript_is_draft (boolean)
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
// spoken_article (object meta)
// ---------------------------------------------------------------------------

test.describe( 'spoken_article meta field', () => {
	test( 'defaults to empty object structure on a new post', async ( {
		requestUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'Meta Default Test',
			status: 'draft',
		} );

		try {
			const fetched = await requestUtils.rest( {
				method: 'GET',
				path: `/wp/v2/posts/${ post.id }`,
				params: { context: 'edit' },
			} );

			const meta = fetched.meta;
			expect( meta ).toHaveProperty( 'spoken_article' );
			expect( meta.spoken_article ).toMatchObject( {
				attachment_id: 0,
				audio_url: '',
				duration: '',
			} );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );

	test( 'can be written and read back via REST', async ( {
		requestUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'Meta Write/Read Test',
			status: 'draft',
		} );

		const audioData = {
			attachment_id: 42,
			audio_url: 'https://example.com/audio/test.mp3',
			duration: '3:45',
		};

		try {
			// Write via REST.
			await requestUtils.rest( {
				method: 'POST',
				path: `/wp/v2/posts/${ post.id }`,
				data: { meta: { spoken_article: audioData } },
			} );

			// Read back.
			const updated = await requestUtils.rest( {
				method: 'GET',
				path: `/wp/v2/posts/${ post.id }`,
				params: { context: 'edit' },
			} );

			expect( updated.meta.spoken_article ).toMatchObject( audioData );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );

	test( 'can be cleared back to defaults', async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Meta Clear Test',
			status: 'draft',
			meta: {
				spoken_article: {
					attachment_id: 7,
					audio_url: 'https://example.com/clear.mp3',
					duration: '1:00',
				},
			},
		} );

		try {
			await requestUtils.rest( {
				method: 'POST',
				path: `/wp/v2/posts/${ post.id }`,
				data: {
					meta: {
						spoken_article: {
							attachment_id: 0,
							audio_url: '',
							duration: '',
						},
					},
				},
			} );

			const updated = await requestUtils.rest( {
				method: 'GET',
				path: `/wp/v2/posts/${ post.id }`,
				params: { context: 'edit' },
			} );

			expect( updated.meta.spoken_article ).toMatchObject( {
				attachment_id: 0,
				audio_url: '',
				duration: '',
			} );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );
} );

// ---------------------------------------------------------------------------
// spoken_article_play_count (integer meta)
// ---------------------------------------------------------------------------

test.describe( 'spoken_article_play_count meta field', () => {
	test( 'defaults to 0 on a new post', async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Play Count Default',
			status: 'draft',
		} );

		try {
			const fetched = await requestUtils.rest( {
				method: 'GET',
				path: `/wp/v2/posts/${ post.id }`,
				params: { context: 'edit' },
			} );

			expect( fetched.meta.spoken_article_play_count ).toBe( 0 );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );

	test( 'play count is incremented correctly by the custom endpoint', async ( {
		requestUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'Play Count Increment Meta',
			status: 'publish',
		} );

		try {
			await requestUtils.rest( {
				method: 'POST',
				path: `/prc-spoken-article/v1/play-count/${ post.id }`,
			} );
			await requestUtils.rest( {
				method: 'POST',
				path: `/prc-spoken-article/v1/play-count/${ post.id }`,
			} );
			await requestUtils.rest( {
				method: 'POST',
				path: `/prc-spoken-article/v1/play-count/${ post.id }`,
			} );

			const updated = await requestUtils.rest( {
				method: 'GET',
				path: `/wp/v2/posts/${ post.id }`,
				params: { context: 'edit' },
			} );

			expect( updated.meta.spoken_article_play_count ).toBe( 3 );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );
} );

// ---------------------------------------------------------------------------
// spoken_article_transcript (string meta)
// ---------------------------------------------------------------------------

test.describe( 'spoken_article_transcript meta field', () => {
	test( 'defaults to empty string', async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Transcript Default',
			status: 'draft',
		} );

		try {
			const fetched = await requestUtils.rest( {
				method: 'GET',
				path: `/wp/v2/posts/${ post.id }`,
				params: { context: 'edit' },
			} );

			expect( fetched.meta.spoken_article_transcript ).toBe( '' );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );

	test( 'stores and retrieves transcript text', async ( {
		requestUtils,
	} ) => {
		const transcriptText =
			'This is a detailed transcript of the spoken article content.';
		const post = await requestUtils.createPost( {
			title: 'Transcript Write Test',
			status: 'draft',
		} );

		try {
			await requestUtils.rest( {
				method: 'POST',
				path: `/wp/v2/posts/${ post.id }`,
				data: {
					meta: { spoken_article_transcript: transcriptText },
				},
			} );

			const updated = await requestUtils.rest( {
				method: 'GET',
				path: `/wp/v2/posts/${ post.id }`,
				params: { context: 'edit' },
			} );

			expect( updated.meta.spoken_article_transcript ).toBe(
				transcriptText
			);
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );
} );

// ---------------------------------------------------------------------------
// spoken_article_transcript_is_draft (boolean meta)
// ---------------------------------------------------------------------------

test.describe( 'spoken_article_transcript_is_draft meta field', () => {
	test( 'defaults to false', async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Transcript Draft Default',
			status: 'draft',
		} );

		try {
			const fetched = await requestUtils.rest( {
				method: 'GET',
				path: `/wp/v2/posts/${ post.id }`,
				params: { context: 'edit' },
			} );

			expect(
				fetched.meta.spoken_article_transcript_is_draft
			).toBe( false );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );

	test( 'can be set to true and back to false', async ( {
		requestUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'Transcript Draft Toggle',
			status: 'draft',
		} );

		try {
			// Set to true.
			await requestUtils.rest( {
				method: 'POST',
				path: `/wp/v2/posts/${ post.id }`,
				data: {
					meta: { spoken_article_transcript_is_draft: true },
				},
			} );

			let updated = await requestUtils.rest( {
				method: 'GET',
				path: `/wp/v2/posts/${ post.id }`,
				params: { context: 'edit' },
			} );
			expect(
				updated.meta.spoken_article_transcript_is_draft
			).toBe( true );

			// Set back to false.
			await requestUtils.rest( {
				method: 'POST',
				path: `/wp/v2/posts/${ post.id }`,
				data: {
					meta: { spoken_article_transcript_is_draft: false },
				},
			} );

			updated = await requestUtils.rest( {
				method: 'GET',
				path: `/wp/v2/posts/${ post.id }`,
				params: { context: 'edit' },
			} );
			expect(
				updated.meta.spoken_article_transcript_is_draft
			).toBe( false );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );
} );

// ---------------------------------------------------------------------------
// All four meta fields together
// ---------------------------------------------------------------------------

test.describe( 'All spoken article meta fields — combined', () => {
	test( 'all four fields are present and correct after a single write', async ( {
		requestUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'Combined Meta Test',
			status: 'draft',
			meta: {
				spoken_article: {
					attachment_id: 100,
					audio_url: 'https://example.com/combined.mp3',
					duration: '5:00',
				},
				spoken_article_transcript: 'Combined transcript text.',
				spoken_article_transcript_is_draft: true,
			},
		} );

		try {
			const fetched = await requestUtils.rest( {
				method: 'GET',
				path: `/wp/v2/posts/${ post.id }`,
				params: { context: 'edit' },
			} );

			const { meta } = fetched;

			expect( meta.spoken_article ).toMatchObject( {
				attachment_id: 100,
				audio_url: 'https://example.com/combined.mp3',
				duration: '5:00',
			} );
			expect( meta.spoken_article_play_count ).toBe( 0 );
			expect( meta.spoken_article_transcript ).toBe(
				'Combined transcript text.'
			);
			expect( meta.spoken_article_transcript_is_draft ).toBe( true );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );
} );
