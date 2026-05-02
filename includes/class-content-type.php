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
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( Loader $loader ) {
		$loader->add_action( 'init', $this, 'register_post_type' );
		$loader->add_action( 'rest_api_init', $this, 'register_rest_fields' );
		$loader->add_filter( 'allowed_block_types_all', $this, 'restrict_block_types', 10, 2 );
		$loader->add_action( 'admin_enqueue_scripts', $this, 'dequeue_ai_summarization', 20 );
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
	 * Get the spoken-article post for a given parent content post.
	 *
	 * @param int $parent_post_id The parent post ID.
	 * @return \WP_Post|null The spoken-article post, or null if none exists.
	 */
	public static function get_spoken_article_for_post( int $parent_post_id ): ?\WP_Post {
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

		return ! empty( $posts ) ? $posts[0] : null;
	}

	/**
	 * Get audio data from the spoken-article CPT for a parent post.
	 *
	 * @param int $parent_post_id The parent post ID.
	 * @return array{attachment_id: int, audio_url: string, duration: string}|null Audio data or null.
	 */
	public static function get_audio_for_post( int $parent_post_id ): ?array {
		$spoken_article = self::get_spoken_article_for_post( $parent_post_id );
		if ( ! $spoken_article ) {
			return null;
		}

		$audio = get_post_meta( $spoken_article->ID, Post_Meta::META_KEY, true );
		if ( empty( $audio ) || empty( $audio['attachment_id'] ) || empty( $audio['audio_url'] ) ) {
			return null;
		}

		return $audio;
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

		return wp_insert_post( $args, true );
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
