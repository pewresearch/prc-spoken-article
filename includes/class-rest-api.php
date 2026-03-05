<?php
/**
 * REST API routes.
 *
 * @package PRC\Platform\Spoken_Article
 */

namespace PRC\Platform\Spoken_Article;

use WordPress\AI_Client\AI_Client;

/**
 * Registers REST routes for play-count increment and TTS text extraction.
 */
class Rest_API {

	const NAMESPACE = 'prc-spoken-article/v1';

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( $loader ) {
		$loader->add_action( 'rest_api_init', $this, 'register_routes' );
	}

	/**
	 * Register REST routes.
	 *
	 * @hook rest_api_init
	 */
	public function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/play-count/(?P<post_id>\d+)',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'increment_play_count' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'post_id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/voice',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'save_voice_selection' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
				'args'                => array(
					'voice_id' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/tts-text/(?P<post_id>\d+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_tts_text_endpoint' ),
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'post_id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
	}

	/**
	 * Increment play count for a post.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function increment_play_count( $request ) {
		$post_id = $request->get_param( 'post_id' );
		$post    = get_post( $post_id );

		if ( ! $post ) {
			return new \WP_Error(
				'post_not_found',
				__( 'Post not found.', 'prc-spoken-article' ),
				array( 'status' => 404 )
			);
		}

		if ( ! post_type_supports( $post->post_type, Bootstrap::POST_TYPE_SUPPORT ) ) {
			return new \WP_Error(
				'not_supported',
				__( 'Post type does not support spoken articles.', 'prc-spoken-article' ),
				array( 'status' => 400 )
			);
		}

		$current = (int) get_post_meta( $post_id, Post_Meta::PLAY_COUNT_META_KEY, true );
		$new     = $current + 1;
		update_post_meta( $post_id, Post_Meta::PLAY_COUNT_META_KEY, $new );

		return rest_ensure_response( array( 'play_count' => $new ) );
	}

	/**
	 * Save the selected ElevenLabs voice ID.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function save_voice_selection( $request ) {
		$voice_id = $request->get_param( 'voice_id' );
		update_option( 'elevenlabs_voice_id', $voice_id );
		return rest_ensure_response( array( 'voice_id' => $voice_id ) );
	}

	/**
	 * REST endpoint: return TTS-ready text for a post.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_tts_text_endpoint( $request ) {
		$post_id = $request->get_param( 'post_id' );
		$post    = get_post( $post_id );

		if ( ! $post ) {
			return new \WP_Error(
				'post_not_found',
				__( 'Post not found.', 'prc-spoken-article' ),
				array( 'status' => 404 )
			);
		}

		$full_text = $this->get_text_for_tts( $post );
		$text      = $this->summarize_for_listeners_digest( $full_text, get_the_title( $post ) );
		$text      = $this->truncate_to_elevenlabs_limit( $text );

		return rest_ensure_response(
			array(
				'text'      => $text,
				'charCount' => strlen( $text ),
			)
		);
	}

	/**
	 * Extract text content from post HTML.
	 *
	 * @param string $html The HTML content.
	 * @return string The extracted plain text.
	 */
	private function extract_text_from_html( $html ) {
		$text = wp_strip_all_tags( $html );
		$text = preg_replace( '#https?://[^\s<>"\']+#i', '', $text );
		$text = preg_replace( '#www\.[^\s<>"\']+#i', '', $text );
		$text = preg_replace( '/\s+/', ' ', $text );
		$text = trim( $text );

		return $text;
	}

	/**
	 * Get plain text for TTS from post, using markdown converter when available.
	 *
	 * Primary path: prc-markdown-for-agents Markdown_Converter (produces lean prose).
	 * Fallback: the_content + extract_text_from_html when plugin unavailable.
	 *
	 * @param \WP_Post $post The post object.
	 * @return string Plain text suitable for ElevenLabs TTS.
	 */
	private function get_text_for_tts( \WP_Post $post ): string {
		if ( class_exists( \PRC\Platform\Markdown_For_Agents\Markdown_Converter::class ) ) {
			$converter = new \PRC\Platform\Markdown_For_Agents\Markdown_Converter();
			$markdown  = $converter->post_to_markdown( $post );
			if ( '' !== trim( $markdown ) ) {
				return $this->strip_markdown_for_tts( $markdown );
			}
		}

		$content = apply_filters( 'the_content', $post->post_content );
		return $this->extract_text_from_html( $content );
	}

	/**
	 * Strip markdown syntax to produce plain text suitable for TTS.
	 *
	 * @param string $markdown Markdown content.
	 * @return string Plain text.
	 */
	private function strip_markdown_for_tts( string $markdown ): string {
		$text = preg_replace( '/^#{1,6}\s+/m', '', $markdown );
		$text = preg_replace( '/\*\*(.+?)\*\*/s', '$1', $text );
		$text = preg_replace( '/\*(.+?)\*/s', '$1', $text );
		$text = preg_replace( '/__(.+?)__/s', '$1', $text );
		$text = preg_replace( '/_(.+?)_/s', '$1', $text );
		$text = preg_replace( '/\[([^\]]+)\]\([^)]+\)/', '$1', $text );
		$text = preg_replace( '/\[([^\]]+)\]\[[^\]]*\]/', '$1', $text );
		$text = preg_replace( '/!\[[^\]]*\]\([^)]+\)/', '', $text );
		$text = preg_replace( '/!\[[^\]]*\]\[[^\]]*\]/', '', $text );
		$text = preg_replace( '#https?://[^\s<>"\'\)]+#i', '', $text );
		$text = preg_replace( '#www\.[^\s<>"\'\)]+#i', '', $text );
		$text = preg_replace( '/^\|.+\|$/m', '', $text );
		$text = preg_replace( '/^\|[-:\s|]+\|$/m', '', $text );
		$text = preg_replace( '/^[-*_]{3,}\s*$/m', '', $text );
		$text = preg_replace( '/\s+/', ' ', $text );
		$text = trim( $text );

		return $text;
	}

	/**
	 * Summarize article text into a "Listener's Digest" (~4 min audio).
	 *
	 * Uses the WordPress AI Client to condense the full article into
	 * approximately 600 words of conversational prose optimized for TTS.
	 * Falls back to the full text if the AI client is unavailable.
	 *
	 * @param string $full_text The full article text.
	 * @param string $post_title The post title for context.
	 * @return string Condensed text for TTS.
	 */
	private function summarize_for_listeners_digest( string $full_text, string $post_title ): string {
		if ( ! class_exists( AI_Client::class ) ) {
			return $full_text;
		}

		$system = <<<'PROMPT'
You are an expert audio content editor for a research organization. Your job is to create
a "Listener's Digest" -- a condensed spoken summary of a research article optimized for
audio consumption. The summary must be no longer than 600 words (approximately 4 minutes
of audio at natural speaking pace).

Guidelines:
- Begin with a brief spoken disclaimer: "This audio was generated using artificial intelligence."
- Then lead with the key finding or headline takeaway
- Pull from the "About This Research" or methodology section to briefly establish credibility
- Summarize the main overview headings and their key points
- Reference notable data from charts, tables, and figures by describing the finding
  (e.g. "The survey found that 62% of Americans..." rather than "Figure 3 shows...")
- Use natural, conversational prose suitable for spoken narration -- no bullet points,
  no section headers, no markdown
- Maintain the factual precision and neutral tone of the original research
- End with one sentence noting where to find the full report
- Do NOT add any preamble like "Here is a summary" -- begin directly with the content
PROMPT;

		$user_prompt = "Article title: {$post_title}\n\nFull article text:\n{$full_text}";

		try {
			$summary = AI_Client::prompt( $user_prompt )
				->using_system_instruction( $system )
				->using_temperature( 0.3 )
				->generate_text();

			$summary = trim( $summary );
			if ( strlen( $summary ) > 100 ) {
				return $summary;
			}
		} catch ( \Exception $e ) {
			error_log( 'Spoken Article AI summarization failed: ' . $e->getMessage() ); // phpcs:ignore
		}

		return $full_text;
	}

	/**
	 * Truncate text to ElevenLabs character limit at a sentence boundary.
	 *
	 * @param string $text  The text to truncate.
	 * @param int    $limit Max character count (default 10000).
	 * @return string Truncated text, or original if under limit.
	 */
	private function truncate_to_elevenlabs_limit( string $text, int $limit = 10000 ): string {
		if ( strlen( $text ) <= $limit ) {
			return $text;
		}

		$truncated     = substr( $text, 0, $limit );
		$last_boundary = strrpos( $truncated, '.' );
		$alt1          = strrpos( $truncated, '!' );
		$alt2          = strrpos( $truncated, '?' );
		if ( false !== $alt1 && ( false === $last_boundary || $alt1 > $last_boundary ) ) {
			$last_boundary = $alt1;
		}
		if ( false !== $alt2 && ( false === $last_boundary || $alt2 > $last_boundary ) ) {
			$last_boundary = $alt2;
		}

		if ( false !== $last_boundary && $last_boundary > (int) ( $limit * 0.5 ) ) {
			return substr( $text, 0, $last_boundary + 1 );
		}

		return $truncated;
	}
}
