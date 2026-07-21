<?php
/**
 * REST API routes.
 *
 * @package PRC\Platform\Spoken_Article
 */

declare( strict_types=1 );

namespace PRC\Platform\Spoken_Article;

/**
 * Registers REST routes for play-count increment, TTS text extraction,
 * voice selection, and spoken-article CPT management.
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
		$loader->add_filter( 'rest_pre_serve_request', $this, 'serve_tts_binary', 10, 4 );
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
			'/elevenlabs/voices',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'list_elevenlabs_voices' ),
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'search'         => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'page_size'      => array(
						'type'              => 'integer',
						'default'           => 30,
						'sanitize_callback' => 'absint',
					),
					'sort'           => array(
						'type'              => 'string',
						'default'           => 'name',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'sort_direction' => array(
						'type'              => 'string',
						'default'           => 'asc',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'refresh'        => array(
						'type'    => 'boolean',
						'default' => false,
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/elevenlabs/voices/(?P<voice_id>[a-zA-Z0-9_-]+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_elevenlabs_voice' ),
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'voice_id' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'refresh'  => array(
						'type'    => 'boolean',
						'default' => false,
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/elevenlabs/tts',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'elevenlabs_tts' ),
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'args'                => array(
					'text'           => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_textarea_field',
					),
					'voice_id'       => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'model_id'       => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'voice_settings' => array(
						'type' => 'object',
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
					'post_id'        => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
					'target_minutes' => array(
						'type'              => 'number',
						'default'           => 4,
						'minimum'           => 1,
						'maximum'           => 8,
						'sanitize_callback' => function ( $value ) {
							return (float) $value;
						},
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/spoken-article-for/(?P<post_id>\d+)',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_spoken_article_for_post' ),
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
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_spoken_article_for_post' ),
					'permission_callback' => function () {
						return current_user_can( 'edit_posts' );
					},
					'args'                => array(
						'post_id'        => array(
							'required'          => true,
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
						),
						'target_minutes' => array(
							'type'              => 'number',
							'default'           => 4,
							'minimum'           => 1,
							'maximum'           => 8,
							'sanitize_callback' => function ( $value ) {
								return (float) $value;
							},
						),
					),
				),
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_spoken_article_for_post' ),
					'permission_callback' => function () {
						return current_user_can( 'delete_posts' );
					},
					'args'                => array(
						'post_id' => array(
							'required'          => true,
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
						),
					),
				),
			)
		);
	}

	/**
	 * Increment play count. Accepts either a parent post ID or a spoken-article CPT ID.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function increment_play_count( $request ) {
		$post_id = (int) $request->get_param( 'post_id' );
		$post    = get_post( $post_id );

		if ( ! $post ) {
			return new \WP_Error(
				'post_not_found',
				__( 'Post not found.', 'prc-spoken-article' ),
				array( 'status' => 404 )
			);
		}

		$spoken_article_id = $post_id;

		if ( Content_Type::POST_TYPE !== $post->post_type ) {
			$spoken_article = Content_Type::get_spoken_article_for_post( $post_id );
			if ( ! $spoken_article ) {
				return new \WP_Error(
					'no_spoken_article',
					__( 'No spoken article found for this post.', 'prc-spoken-article' ),
					array( 'status' => 404 )
				);
			}
			$spoken_article_id = $spoken_article->ID;
		}

		$current = (int) get_post_meta( $spoken_article_id, Post_Meta::PLAY_COUNT_META_KEY, true );
		$new     = $current + 1;
		update_post_meta( $spoken_article_id, Post_Meta::PLAY_COUNT_META_KEY, $new );

		return rest_ensure_response( array( 'play_count' => $new ) );
	}

	/**
	 * Save the selected ElevenLabs voice ID.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function save_voice_selection( $request ) {
		$voice_id = Voice::save_default_voice_id( (string) $request->get_param( 'voice_id' ) );
		return rest_ensure_response( array( 'voice_id' => $voice_id ) );
	}

	/**
	 * List ElevenLabs voices (proxied; cached in Voice).
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function list_elevenlabs_voices( $request ) {
		$refresh = (bool) $request->get_param( 'refresh' );
		if ( $refresh && ! current_user_can( 'manage_options' ) ) {
			$refresh = false;
		}

		$result = Voice::list_voices(
			array(
				'search'         => $request->get_param( 'search' ),
				'page_size'      => $request->get_param( 'page_size' ),
				'sort'           => $request->get_param( 'sort' ),
				'sort_direction' => $request->get_param( 'sort_direction' ),
			),
			$refresh
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}

	/**
	 * Get a single ElevenLabs voice (proxied; cached in Voice).
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_elevenlabs_voice( $request ) {
		$refresh = (bool) $request->get_param( 'refresh' );
		if ( $refresh && ! current_user_can( 'manage_options' ) ) {
			$refresh = false;
		}

		$result = Voice::get_voice( (string) $request->get_param( 'voice_id' ), $refresh );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $result );
	}

	/**
	 * Proxy TTS to ElevenLabs; returns raw audio/mpeg (served via serve_tts_binary).
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function elevenlabs_tts( $request ) {
		$voice_settings = $request->get_param( 'voice_settings' );
		if ( ! is_array( $voice_settings ) ) {
			$voice_settings = array();
		}

		$audio = ElevenLabs_TTS::synthesize(
			(string) $request->get_param( 'text' ),
			(string) ( $request->get_param( 'voice_id' ) ?: Voice::get_default_voice_id() ),
			(string) ( $request->get_param( 'model_id' ) ?: ElevenLabs_Settings::get_production_model() ),
			$voice_settings
		);

		if ( is_wp_error( $audio ) ) {
			return $audio;
		}

		$response = new \WP_REST_Response( $audio, 200 );
		$response->header( 'Content-Type', 'audio/mpeg' );
		$response->header( 'Content-Disposition', 'inline; filename="spoken-article-tts.mp3"' );
		return $response;
	}

	/**
	 * Serve raw MP3 bytes for the TTS proxy instead of JSON-encoding the body.
	 *
	 * @param bool             $served  Whether the request has already been served.
	 * @param \WP_HTTP_Response $result  Result to send to the client.
	 * @param \WP_REST_Request  $request Request used to generate the response.
	 * @param \WP_REST_Server   $server  Server instance.
	 * @return bool
	 */
	public function serve_tts_binary( $served, $result, $request, $server ) {
		if ( $served || ! $result instanceof \WP_REST_Response ) {
			return $served;
		}

		$route = $request->get_route();
		if ( ! is_string( $route ) || ! str_ends_with( $route, '/elevenlabs/tts' ) ) {
			return $served;
		}

		$data = $result->get_data();
		if ( ! is_string( $data ) || '' === $data ) {
			return $served;
		}

		foreach ( $result->get_headers() as $key => $values ) {
			foreach ( (array) $values as $value ) {
				header( sprintf( '%s: %s', $key, $value ) );
			}
		}

		status_header( $result->get_status() );
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- binary audio
		echo $data;
		return true;
	}

	/**
	 * REST endpoint: return TTS-ready text for a post.
	 *
	 * Accepts either a parent post ID or a spoken-article CPT ID.
	 * When a spoken-article CPT ID is passed, text is extracted from its post_parent.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_tts_text_endpoint( $request ) {
		$post_id = (int) $request->get_param( 'post_id' );
		$post    = get_post( $post_id );

		if ( ! $post ) {
			return new \WP_Error(
				'post_not_found',
				__( 'Post not found.', 'prc-spoken-article' ),
				array( 'status' => 404 )
			);
		}

		$content_post = $post;
		if ( Content_Type::POST_TYPE === $post->post_type && $post->post_parent > 0 ) {
			$content_post = get_post( $post->post_parent );
			if ( ! $content_post ) {
				return new \WP_Error(
					'parent_not_found',
					__( 'Parent content post not found.', 'prc-spoken-article' ),
					array( 'status' => 404 )
				);
			}
		}

		$target_minutes = (float) $request->get_param( 'target_minutes' );
		$full_text      = $this->get_text_for_tts( $content_post );
		$summary_result = $this->summarize_for_listeners_digest( $full_text, get_the_title( $content_post ), $target_minutes );
		$text           = $this->prepend_audio_disclaimer( $summary_result['text'] );
		$text           = $this->truncate_to_elevenlabs_limit( $text );

		return rest_ensure_response(
			array(
				'text'           => $text,
				'charCount'      => strlen( $text ),
				'wasSummarized'  => (bool) $summary_result['was_summarized'],
				'fallbackReason' => (string) ( $summary_result['fallback_reason'] ?? '' ),
			)
		);
	}

	/**
	 * Get the spoken-article CPT data for a parent post.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function get_spoken_article_for_post( $request ) {
		$post_id        = (int) $request->get_param( 'post_id' );
		$spoken_article = Content_Type::get_spoken_article_for_post( $post_id );

		if ( ! $spoken_article ) {
			return rest_ensure_response(
				array(
					'exists' => false,
					'id'     => 0,
				)
			);
		}

		$audio = get_post_meta( $spoken_article->ID, Post_Meta::META_KEY, true );
		if ( ! is_array( $audio ) ) {
			$audio = array(
				'attachment_id' => 0,
				'audio_url'     => '',
				'duration'      => '',
			);
		}

		return rest_ensure_response(
			array(
				'exists'    => true,
				'id'        => $spoken_article->ID,
				'editUrl'   => get_edit_post_link( $spoken_article->ID, 'raw' ),
				'status'    => $spoken_article->post_status,
				'audio'     => $audio,
				'playCount' => (int) get_post_meta( $spoken_article->ID, Post_Meta::PLAY_COUNT_META_KEY, true ),
			)
		);
	}

	/**
	 * Create a spoken-article CPT for a parent post.
	 *
	 * Pre-generates an AI transcript from the parent post content and uses it
	 * as the new spoken-article's post_content.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_spoken_article_for_post( $request ) {
		$post_id        = (int) $request->get_param( 'post_id' );
		$target_minutes = (float) $request->get_param( 'target_minutes' );

		if ( ! Content_Type::post_supports_spoken_article( $post_id ) ) {
			return new \WP_Error(
				'not_supported',
				__( 'This post does not support spoken articles.', 'prc-spoken-article' ),
				array( 'status' => 400 )
			);
		}

		$parent_post = get_post( $post_id );
		if ( ! $parent_post ) {
			return new \WP_Error(
				'parent_not_found',
				__( 'Parent post not found.', 'prc-spoken-article' ),
				array( 'status' => 404 )
			);
		}

		$full_text      = $this->get_text_for_tts( $parent_post );
		$summary_result = $this->summarize_for_listeners_digest( $full_text, get_the_title( $parent_post ), $target_minutes );
		$summary        = $this->prepend_audio_disclaimer( $summary_result['text'] );
		$summary        = $this->truncate_to_elevenlabs_limit( $summary );

		$block_content = $this->text_to_block_markup( $summary );

		$result = Content_Type::create_spoken_article_for_post( $post_id, $block_content );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		// Only mark as a draft transcript when AI summarization actually ran.
		// Saving the raw-text fallback as a draft would cause the sidebar to
		// short-circuit subsequent "Generate" clicks and never re-try the AI.
		if ( $summary_result['was_summarized'] ) {
			update_post_meta( $result, 'spoken_article_transcript_is_draft', true );
		} else {
			delete_post_meta( $result, 'spoken_article_transcript_is_draft' );
		}
		update_post_meta( $result, 'spoken_article_target_minutes', $target_minutes );

		return rest_ensure_response(
			array(
				'id'             => $result,
				'editUrl'        => get_edit_post_link( $result, 'raw' ),
				'wasSummarized'  => (bool) $summary_result['was_summarized'],
				'fallbackReason' => (string) ( $summary_result['fallback_reason'] ?? '' ),
			)
		);
	}

	/**
	 * Delete the spoken-article CPT associated with a parent post.
	 *
	 * Moves the spoken-article post to trash.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_spoken_article_for_post( $request ) {
		$post_id        = (int) $request->get_param( 'post_id' );
		$spoken_article = Content_Type::get_spoken_article_for_post( $post_id );

		if ( ! $spoken_article ) {
			return new \WP_Error(
				'not_found',
				__( 'No spoken article found for this post.', 'prc-spoken-article' ),
				array( 'status' => 404 )
			);
		}

		$deleted = wp_trash_post( $spoken_article->ID );
		if ( ! $deleted ) {
			return new \WP_Error(
				'delete_failed',
				__( 'Failed to delete the spoken article.', 'prc-spoken-article' ),
				array( 'status' => 500 )
			);
		}

		return rest_ensure_response(
			array(
				'deleted' => true,
				'id'      => $spoken_article->ID,
			)
		);
	}

	/**
	 * Convert plain text into serialized paragraph block markup.
	 *
	 * Splits on double newlines; each chunk becomes a `core/paragraph` block.
	 *
	 * @param string $text Plain text.
	 * @return string Serialized block markup.
	 */
	private function text_to_block_markup( string $text ): string {
		$paragraphs = preg_split( '/\n{2,}/', trim( $text ) );
		$paragraphs = array_filter( array_map( 'trim', $paragraphs ) );

		$blocks = array();
		foreach ( $paragraphs as $para ) {
			$escaped  = esc_html( $para );
			$blocks[] = '<!-- wp:paragraph -->' . "\n" . '<p>' . $escaped . '</p>' . "\n" . '<!-- /wp:paragraph -->';
		}

		return implode( "\n\n", $blocks );
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
	 * The standard spoken disclaimer prepended to every spoken-article transcript.
	 *
	 * Kept as a constant so the prefix is comparable for idempotent prepending.
	 */
	const AUDIO_DISCLAIMER = 'This audio was generated using artificial intelligence.';

	/**
	 * Ensure the AI-generated audio disclaimer is the first sentence of the text.
	 *
	 * Idempotent: if the text already starts with the disclaimer (or the model
	 * produced an equivalent variant), the original text is returned unchanged.
	 *
	 * @param string $text The transcript text.
	 * @return string The text with the disclaimer guaranteed at the top.
	 */
	private function prepend_audio_disclaimer( string $text ): string {
		$text = trim( (string) $text );
		if ( '' === $text ) {
			return self::AUDIO_DISCLAIMER;
		}

		// Already starts with the canonical disclaimer (case-insensitive).
		if ( 0 === stripos( $text, self::AUDIO_DISCLAIMER ) ) {
			return $text;
		}

		// Detect common AI-produced variants in the first ~120 chars to avoid
		// duplicating the disclaimer when the model honored the system prompt.
		$head = substr( $text, 0, 200 );
		if ( preg_match( '/^[^.!?]*\b(generated|created|produced|narrated)\b[^.!?]*\bartificial intelligence\b/i', $head )
			|| preg_match( '/^[^.!?]*\bAI[- ]generated\b/i', $head ) ) {
			return $text;
		}

		return self::AUDIO_DISCLAIMER . "\n\n" . $text;
	}

	/**
	 * Summarize article text into a "Listener's Digest".
	 *
	 * Returns a structured result so callers can distinguish a real AI summary
	 * from the raw-text fallback (which previously masqueraded as AI output).
	 *
	 * @param string $full_text      The full article text.
	 * @param string $post_title     The post title for context.
	 * @param float  $target_minutes Target audio length in minutes (1–8, default 4).
	 * @return array{text:string,was_summarized:bool,fallback_reason:string} Result with text and metadata.
	 */
	private function summarize_for_listeners_digest( string $full_text, string $post_title, float $target_minutes = 4.0 ): array {
		if ( ! function_exists( 'wp_ai_client_prompt' ) ) {
			error_log( 'Spoken Article AI summarization fell back: wp_ai_client_prompt() is not available.' ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			return array(
				'text'            => $full_text,
				'was_summarized'  => false,
				'fallback_reason' => 'ai_client_unavailable',
			);
		}

		$target_minutes = max( 1.0, min( 8.0, $target_minutes ) );
		$word_count     = (int) round( $target_minutes * 150 );

		// Note: the disclaimer is also enforced server-side via
		// prepend_audio_disclaimer(). Asking the model to begin with it as well
		// is belt-and-suspenders and improves the cadence of the spoken intro.
		$system = <<<PROMPT
You are an expert audio content editor for a research organization. Your job is to create
a "Listener's Digest" -- a condensed spoken summary of a research article optimized for
audio consumption. The summary must be no longer than {$word_count} words (approximately {$target_minutes} minutes
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

		$builder = wp_ai_client_prompt( $user_prompt );
		if ( is_wp_error( $builder ) ) {
			error_log( 'Spoken Article AI summarization fell back: prompt builder error: ' . $builder->get_error_message() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			return array(
				'text'            => $full_text,
				'was_summarized'  => false,
				'fallback_reason' => 'prompt_builder_error',
			);
		}

		$summary = $builder
			->using_system_instruction( $system )
			->using_temperature( 0.3 )
			->using_model_preference( ...\WordPress\AI\get_preferred_models_for_text_generation() )
			->generate_text();

		if ( is_wp_error( $summary ) ) {
			error_log( 'Spoken Article AI summarization fell back: generate_text error: ' . $summary->get_error_message() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			return array(
				'text'            => $full_text,
				'was_summarized'  => false,
				'fallback_reason' => 'generate_text_error',
			);
		}

		$summary = trim( (string) $summary );
		if ( strlen( $summary ) <= 100 ) {
			error_log( sprintf( 'Spoken Article AI summarization fell back: response too short (%d chars).', strlen( $summary ) ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			return array(
				'text'            => $full_text,
				'was_summarized'  => false,
				'fallback_reason' => 'summary_too_short',
			);
		}

		return array(
			'text'            => $summary,
			'was_summarized'  => true,
			'fallback_reason' => '',
		);
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
