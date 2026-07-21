<?php
/**
 * Spoken Article custom post type.
 *
 * @package PRC\Platform\Spoken_Article
 */

declare( strict_types=1 );

namespace PRC\Platform\Spoken_Article;

/**
 * Registers the private `spoken-article` CPT and provides helpers to
 * look up or create spoken-article posts linked to a parent content post.
 */
class Content_Type {

	const POST_TYPE = 'spoken-article';

	/**
	 * Object cache group for spoken-article parent lookups.
	 */
	private const CACHE_GROUP = 'prc_spoken_article';

	/**
	 * Cache TTL for spoken-article parent lookups.
	 */
	private const CACHE_TTL = HOUR_IN_SECONDS;

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( Loader $loader ) {
		$loader->add_action( 'init', $this, 'register_post_type' );
		$loader->add_action( 'rest_api_init', $this, 'register_rest_fields' );
		$loader->add_filter( 'allowed_block_types_all', $this, 'restrict_block_types', 10, 2 );
		$loader->add_action( 'admin_enqueue_scripts', $this, 'dequeue_ai_summarization', 20 );
		// Parent content types fire through the publish pipeline.
		$loader->add_action( 'prc_platform_on_update', $this, 'clear_cache_on_update', 10, 1 );
		$loader->add_action( 'prc_platform_on_publish', $this, 'clear_cache_on_update', 10, 1 );
		// spoken-article is not in the publish pipeline allowlist; invalidate on CPT save + audio meta writes.
		$loader->add_action( 'save_post_' . self::POST_TYPE, $this, 'clear_cache_on_spoken_article_save', 10, 1 );
		$loader->add_action( 'updated_post_meta', $this, 'clear_cache_on_audio_meta_change', 10, 4 );
		$loader->add_action( 'added_post_meta', $this, 'clear_cache_on_audio_meta_change', 10, 4 );
		$loader->add_action( 'deleted_post_meta', $this, 'clear_cache_on_audio_meta_change', 10, 4 );
	}

	/**
	 * Whether spoken-article lookups should use object cache.
	 *
	 * Bypass for logged-in users and previews so draft/pending spoken-articles stay visible.
	 *
	 * @return bool
	 */
	public static function should_use_cache(): bool {
		return ! is_user_logged_in() && ! is_preview();
	}

	/**
	 * Cache key for a parent post's spoken-article lookup payload.
	 *
	 * @param int $parent_post_id Parent post ID.
	 * @return string
	 */
	public static function get_lookup_cache_key( int $parent_post_id ): string {
		return 'spoken_article_lookup_' . $parent_post_id;
	}

	/**
	 * Clear cached spoken-article lookup for a parent post.
	 *
	 * @param int $parent_post_id Parent post ID.
	 * @return void
	 */
	public static function clear_cache_for_parent( int $parent_post_id ): void {
		if ( $parent_post_id <= 0 ) {
			return;
		}

		wp_cache_delete( self::get_lookup_cache_key( $parent_post_id ), self::CACHE_GROUP );
	}

	/**
	 * Invalidate spoken-article lookup cache when parent content updates.
	 *
	 * @hook prc_platform_on_update
	 * @hook prc_platform_on_publish
	 *
	 * @param object $post Extended WP_Post-like object from the pipeline.
	 * @return void
	 */
	public function clear_cache_on_update( $post ): void {
		// Pipeline passes stdClass from setup_extra_wp_post_object_fields(), not WP_Post.
		if ( ! is_object( $post ) || empty( $post->ID ) || empty( $post->post_type ) ) {
			return;
		}

		// spoken-article CPT saves are handled by clear_cache_on_spoken_article_save;
		// the publish pipeline never emits these hooks for that post type.
		if ( self::POST_TYPE === $post->post_type ) {
			return;
		}

		self::clear_cache_for_parent( (int) $post->ID );
	}

	/**
	 * Invalidate parent lookup cache when a spoken-article CPT is saved.
	 *
	 * @hook save_post_spoken-article
	 *
	 * @param int $post_id Spoken-article post ID.
	 * @return void
	 */
	public function clear_cache_on_spoken_article_save( $post_id ): void {
		$parent_id = (int) wp_get_post_parent_id( (int) $post_id );
		if ( $parent_id > 0 ) {
			self::clear_cache_for_parent( $parent_id );
		}
	}

	/**
	 * Invalidate parent lookup cache when spoken-article audio meta changes.
	 *
	 * Audio generation often writes meta without a full parent-content pipeline event.
	 *
	 * @hook updated_post_meta
	 * @hook added_post_meta
	 * @hook deleted_post_meta
	 *
	 * @param mixed  $meta_id    Meta ID (or IDs on delete).
	 * @param int    $object_id  Object ID.
	 * @param string $meta_key   Meta key.
	 * @param mixed  $meta_value Meta value.
	 * @return void
	 */
	public function clear_cache_on_audio_meta_change( $meta_id, $object_id, $meta_key, $meta_value ): void {
		unset( $meta_id, $meta_value );
		if ( Post_Meta::META_KEY !== $meta_key ) {
			return;
		}

		$post = get_post( (int) $object_id );
		if ( ! $post instanceof \WP_Post || self::POST_TYPE !== $post->post_type ) {
			return;
		}

		$parent_id = (int) $post->post_parent;
		if ( $parent_id > 0 ) {
			self::clear_cache_for_parent( $parent_id );
		}
	}

	/**
	 * Dequeue the AI summarization script on the spoken-article editor screen.
	 *
	 * @hook admin_enqueue_scripts 20
	 *
	 * @param string $hook_suffix The current admin page hook suffix.
	 */
	public function dequeue_ai_summarization( string $hook_suffix ): void {
		if ( 'post.php' !== $hook_suffix && 'post-new.php' !== $hook_suffix ) {
			return;
		}
		$screen = get_current_screen();
		if ( $screen && self::POST_TYPE === $screen->post_type ) {
			wp_dequeue_script( 'ai_summarization' );
			wp_dequeue_style( 'ai_summarization' );
			wp_dequeue_script( 'ai_title_generation' );
			wp_dequeue_style( 'ai_title_generation' );
			wp_dequeue_script( 'ai_excerpt_generation' );
			wp_dequeue_style( 'ai_excerpt_generation' );
		}
	}

	/**
	 * Restrict the spoken-article CPT editor to paragraph and heading blocks only.
	 *
	 * @hook allowed_block_types_all
	 *
	 * @param bool|string[]            $allowed_block_types The current allowed block types.
	 * @param \WP_Block_Editor_Context $editor_context The editor context.
	 * @return bool|string[] Filtered allowed block types.
	 */
	public function restrict_block_types( $allowed_block_types, $editor_context ) {
		if ( isset( $editor_context->post ) && self::POST_TYPE === $editor_context->post->post_type ) {
			return array( 'core/paragraph', 'core/heading' );
		}
		return $allowed_block_types;
	}

	/**
	 * Expose post_parent on the spoken-article REST response.
	 *
	 * Matches the platform-wide pattern in Post_Publish_Pipeline.
	 *
	 * @hook rest_api_init
	 */
	public function register_rest_fields(): void {
		register_rest_field(
			self::POST_TYPE,
			'post_parent',
			array(
				'get_callback' => function ( $object ) {
					$post_id = (int) ( $object['id'] ?? $object['ID'] ?? 0 );
					return wp_get_post_parent_id( $post_id );
				},
			)
		);
	}

	/**
	 * Register the spoken-article CPT.
	 *
	 * @hook init
	 */
	public function register_post_type(): void {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'               => __( 'Spoken Articles', 'prc-spoken-article' ),
					'singular_name'      => __( 'Spoken Article', 'prc-spoken-article' ),
					'add_new'            => __( 'Add New', 'prc-spoken-article' ),
					'add_new_item'       => __( 'Add New Spoken Article', 'prc-spoken-article' ),
					'edit_item'          => __( 'Edit Spoken Article', 'prc-spoken-article' ),
					'new_item'           => __( 'New Spoken Article', 'prc-spoken-article' ),
					'view_item'          => __( 'View Spoken Article', 'prc-spoken-article' ),
					'search_items'       => __( 'Search Spoken Articles', 'prc-spoken-article' ),
					'not_found'          => __( 'No spoken articles found.', 'prc-spoken-article' ),
					'not_found_in_trash' => __( 'No spoken articles found in trash.', 'prc-spoken-article' ),
				),
				'public'              => false,
				'show_ui'             => true,
				'show_in_menu'        => true,
				'show_in_rest'        => true,
				'menu_icon'           => 'dashicons-microphone',
				'supports'            => array( 'title', 'editor', 'revisions', 'custom-fields' ),
				'has_archive'         => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'rewrite'             => false,
				'capability_type'     => 'post',
				'map_meta_cap'        => true,
			)
		);
		add_post_type_support( self::POST_TYPE, 'editor', array( 'notes' => true ) );
	}

	/**
	 * Query spoken-article ID and audio payload for a parent post.
	 *
	 * @param int $parent_post_id Parent post ID.
	 * @return array{spoken_article_id: int|null, audio: array|null}
	 */
	private static function query_spoken_article_lookup( int $parent_post_id ): array {
		$posts = get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'post_parent'    => $parent_post_id,
				'post_status'    => array( 'publish', 'draft', 'pending', 'private' ),
				'posts_per_page' => 1,
				'orderby'        => 'date',
				'order'          => 'DESC',
				'no_found_rows'  => true,
			)
		);

		if ( empty( $posts ) ) {
			return array(
				'spoken_article_id' => null,
				'audio'             => null,
			);
		}

		$spoken_article_id = (int) $posts[0]->ID;
		$audio             = get_post_meta( $spoken_article_id, Post_Meta::META_KEY, true );
		if ( empty( $audio ) || empty( $audio['attachment_id'] ) || empty( $audio['audio_url'] ) ) {
			$audio = null;
		}

		return array(
			'spoken_article_id' => $spoken_article_id,
			'audio'             => $audio,
		);
	}

	/**
	 * Get cached spoken-article lookup payload for a parent post.
	 *
	 * @param int $parent_post_id Parent post ID.
	 * @return array{spoken_article_id: int|null, audio: array|null}
	 */
	public static function get_spoken_article_lookup( int $parent_post_id ): array {
		if ( $parent_post_id <= 0 ) {
			return array(
				'spoken_article_id' => null,
				'audio'             => null,
			);
		}

		if ( ! self::should_use_cache() ) {
			return self::query_spoken_article_lookup( $parent_post_id );
		}

		$cache_key = self::get_lookup_cache_key( $parent_post_id );
		$cached    = wp_cache_get( $cache_key, self::CACHE_GROUP );
		if ( false !== $cached && is_array( $cached ) ) {
			return $cached;
		}

		$lookup = self::query_spoken_article_lookup( $parent_post_id );
		wp_cache_set( $cache_key, $lookup, self::CACHE_GROUP, self::CACHE_TTL );

		return $lookup;
	}

	/**
	 * Get the spoken-article post for a given parent content post.
	 *
	 * @param int $parent_post_id The parent post ID.
	 * @return \WP_Post|null The spoken-article post, or null if none exists.
	 */
	public static function get_spoken_article_for_post( int $parent_post_id ): ?\WP_Post {
		$lookup = self::get_spoken_article_lookup( $parent_post_id );
		if ( empty( $lookup['spoken_article_id'] ) ) {
			return null;
		}

		$post = get_post( (int) $lookup['spoken_article_id'] );
		return $post instanceof \WP_Post ? $post : null;
	}

	/**
	 * Get audio data from the spoken-article CPT for a parent post.
	 *
	 * @param int $parent_post_id The parent post ID.
	 * @return array{attachment_id: int, audio_url: string, duration: string}|null Audio data or null.
	 */
	public static function get_audio_for_post( int $parent_post_id ): ?array {
		$lookup = self::get_spoken_article_lookup( $parent_post_id );
		$audio  = $lookup['audio'] ?? null;

		return is_array( $audio ) ? $audio : null;
	}

	/**
	 * Create a spoken-article post for a parent content post.
	 *
	 * @param int    $parent_post_id The parent post ID.
	 * @param string $content        Optional pre-generated post content (serialized block markup).
	 * @return int|\WP_Error The new spoken-article post ID, or WP_Error on failure.
	 */
	public static function create_spoken_article_for_post( int $parent_post_id, string $content = '' ) {
		$parent = get_post( $parent_post_id );
		if ( ! $parent ) {
			return new \WP_Error(
				'parent_not_found',
				__( 'Parent post not found.', 'prc-spoken-article' )
			);
		}

		$existing = self::get_spoken_article_for_post( $parent_post_id );
		if ( $existing ) {
			return $existing->ID;
		}

		$title = sprintf(
			/* translators: %s: parent post title */
			__( 'Spoken Article: %s', 'prc-spoken-article' ),
			get_the_title( $parent_post_id )
		);

		$args = array(
			'post_type'   => self::POST_TYPE,
			'post_parent' => $parent_post_id,
			'post_title'  => $title,
			'post_status' => 'draft',
		);

		if ( ! empty( $content ) ) {
			$args['post_content'] = $content;
		}

		$post_id = wp_insert_post( $args, true );
		if ( ! is_wp_error( $post_id ) ) {
			self::clear_cache_for_parent( $parent_post_id );
		}

		return $post_id;
	}

	/**
	 * Check if a post is eligible for spoken article support.
	 *
	 * Excludes child posts (report chapters) and post types without support.
	 *
	 * @param int $post_id The post ID to check.
	 * @return bool Whether the post can have a spoken article.
	 */
	public static function post_supports_spoken_article( int $post_id ): bool {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return false;
		}

		if ( ! post_type_supports( $post->post_type, Bootstrap::POST_TYPE_SUPPORT ) ) {
			return false;
		}

		if ( $post->post_parent > 0 ) {
			return false;
		}

		return true;
	}
}
