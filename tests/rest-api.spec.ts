/**
 * REST API Tests — prc-spoken-article
 *
 * Covers three custom endpoints registered in class-rest-api.php:
 *   POST /prc-spoken-article/v1/play-count/:post_id
 *   POST /prc-spoken-article/v1/voice
 *   GET  /prc-spoken-article/v1/tts-text/:post_id
 */

import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

const REST_NS = 'prc-spoken-article/v1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function createTestPost(
	requestUtils: RequestUtils,
	title = 'Spoken Article Test Post'
) {
	return requestUtils.createPost( { title, status: 'publish' } );
}

// ---------------------------------------------------------------------------
// play-count endpoint
// ---------------------------------------------------------------------------

test.describe( 'POST /prc-spoken-article/v1/play-count/:post_id', () => {
	test( 'increments play count for a valid post', async ( {
		requestUtils,
	} ) => {
		const post = await createTestPost( requestUtils );
		try {
			const response = await requestUtils.rest( {
				method: 'POST',
				path: `/${ REST_NS }/play-count/${ post.id }`,
			} );

			expect( response ).toMatchObject( { play_count: 1 } );

			// Second increment
			const response2 = await requestUtils.rest( {
				method: 'POST',
				path: `/${ REST_NS }/play-count/${ post.id }`,
			} );

			expect( response2 ).toMatchObject( { play_count: 2 } );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );

	test( 'returns 404 for non-existent post', async ( { requestUtils } ) => {
		await expect(
			requestUtils.rest( {
				method: 'POST',
				path: `/${ REST_NS }/play-count/999999999`,
			} )
		).rejects.toMatchObject( {
			code: 'post_not_found',
		} );
	} );

	test( 'is publicly accessible (no authentication required)', async ( {
		page,
		requestUtils,
	} ) => {
		const post = await createTestPost( requestUtils );
		try {
			// Hit the endpoint unauthenticated via the page's fetch so no
			// auth cookies are sent.
			const apiUrl = await page.evaluate(
				( { postId, ns } ) => `/wp-json/${ ns }/play-count/${ postId }`,
				{ postId: post.id, ns: REST_NS }
			);

			const response = await page.request.post( apiUrl );
			// permission_callback is __return_true, so should be 200.
			expect( response.status() ).toBe( 200 );
			const body = await response.json();
			expect( body ).toHaveProperty( 'play_count' );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );
} );

// ---------------------------------------------------------------------------
// voice endpoint
// ---------------------------------------------------------------------------

test.describe( 'POST /prc-spoken-article/v1/voice', () => {
	test( 'saves voice selection when authenticated as admin', async ( {
		requestUtils,
	} ) => {
		const testVoiceId = 'TestVoice123';
		const response = await requestUtils.rest( {
			method: 'POST',
			path: `/${ REST_NS }/voice`,
			data: { voice_id: testVoiceId },
		} );

		expect( response ).toMatchObject( { voice_id: testVoiceId } );
	} );

	test( 'rejects request without manage_options capability', async ( {
		page,
	} ) => {
		// Unauthenticated request — should return 401/403.
		const apiUrl = `/wp-json/${ REST_NS }/voice`;
		const response = await page.request.post( apiUrl, {
			data: { voice_id: 'ShouldFail' },
		} );

		expect( [ 401, 403 ] ).toContain( response.status() );
	} );
} );

// ---------------------------------------------------------------------------
// tts-text endpoint
// ---------------------------------------------------------------------------

test.describe( 'GET /prc-spoken-article/v1/tts-text/:post_id', () => {
	test( 'returns text and charCount for a post with content', async ( {
		requestUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'TTS Text Endpoint Test',
			content:
				'<!-- wp:paragraph --><p>This is sample article content for TTS testing.</p><!-- /wp:paragraph -->',
			status: 'publish',
		} );

		try {
			const response = await requestUtils.rest( {
				method: 'GET',
				path: `/${ REST_NS }/tts-text/${ post.id }`,
			} );

			expect( response ).toHaveProperty( 'text' );
			expect( response ).toHaveProperty( 'charCount' );
			expect( typeof response.text ).toBe( 'string' );
			expect( typeof response.charCount ).toBe( 'number' );
			expect( response.charCount ).toBe( response.text.length );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );

	test( 'returns 404 for a non-existent post', async ( {
		requestUtils,
	} ) => {
		await expect(
			requestUtils.rest( {
				method: 'GET',
				path: `/${ REST_NS }/tts-text/999999999`,
			} )
		).rejects.toMatchObject( {
			code: 'post_not_found',
		} );
	} );

	test( 'requires edit_posts capability', async ( { page } ) => {
		const apiUrl = `/wp-json/${ REST_NS }/tts-text/1`;
		const response = await page.request.get( apiUrl );
		expect( [ 401, 403 ] ).toContain( response.status() );
	} );

	test( 'returned text does not contain raw URLs', async ( {
		requestUtils,
	} ) => {
		const post = await requestUtils.createPost( {
			title: 'URL Stripping Test',
			content:
				'<!-- wp:paragraph --><p>See https://example.com/some-link for more. Also www.example.org/path.</p><!-- /wp:paragraph -->',
			status: 'publish',
		} );

		try {
			const response = await requestUtils.rest( {
				method: 'GET',
				path: `/${ REST_NS }/tts-text/${ post.id }`,
			} );

			expect( response.text ).not.toMatch( /https?:\/\//i );
			expect( response.text ).not.toMatch( /www\./i );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );

	test( 'charCount matches actual text length', async ( {
		requestUtils,
	} ) => {
		const post = await createTestPost( requestUtils, 'charCount Verify' );
		try {
			const response = await requestUtils.rest( {
				method: 'GET',
				path: `/${ REST_NS }/tts-text/${ post.id }`,
			} );

			expect( response.charCount ).toBe( response.text.length );
		} finally {
			await deletePost( requestUtils, post.id );
		}
	} );
} );
