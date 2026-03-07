<?php
/**
 * Player Trigger Block
 *
 * @package PRC\Platform\Blocks
 */

namespace PRC\Platform\Spoken_Article;

use PRC\Platform\Spoken_Article\Post_Meta;
use PRC\Platform\Spoken_Article\Rest_API;
use WP_Block;
use WP_HTML_Tag_Processor;

/**
 * Renders the inline trigger button that opens the spoken article player.
 * Only outputs markup when the current post has spoken article audio.
 */
class Player_Trigger_Block {

	/**
	 * Block name
	 *
	 * @var string
	 */
	public static $block_name = 'prc-spoken-article/player-trigger';

	/**
	 * Loader instance
	 *
	 * @var \PRC\Platform\Spoken_Article\Loader
	 */
	protected $loader;

	/**
	 * Constructor
	 *
	 * @param \PRC\Platform\Spoken_Article\Loader $loader The loader instance.
	 */
	public function __construct( $loader ) {
		$this->loader = $loader;
		$this->loader->add_action( 'init', $this, 'register_block' );
	}

	/**
	 * Register the block.
	 *
	 * @hook init
	 */
	public function register_block() {
		register_block_type_from_metadata(
			PRC_SPOKEN_ARTICLE_BLOCKS_DIR . '/player-trigger-block',
			array(
				'render_callback' => array( $this, 'render_block_callback' ),
			)
		);
	}

	/**
	 * Render callback for the trigger block.
	 *
	 * @param array    $attributes Block attributes.
	 * @param string   $content Block content.
	 * @param WP_Block $block Block instance.
	 * @return string Rendered block HTML.
	 */
	public function render_block_callback( $attributes, $content, $block ) {
		// @TODO: Right now this is in BETA mode, so we only want to show the block to logged in users.
		if ( ! is_user_logged_in() ) {
			return '';
		}

		if ( is_admin() ) {
			return '';
		}

		$post_id = $block->context['postId'] ?? get_the_ID();
		if ( ! $post_id ) {
			return '';
		}

		$spoken = get_post_meta( $post_id, Post_Meta::META_KEY, true );
		if ( empty( $spoken ) || empty( $spoken['attachment_id'] ) || empty( $spoken['audio_url'] ) ) {
			return '';
		}

		$audio_url   = $spoken['audio_url'];
		$duration    = $spoken['duration'] ?? '';
		$post_title  = get_the_title( $post_id );
		$post_url    = get_permalink( $post_id );
		$context     = array(
			'audioUrl'          => esc_url( $audio_url ),
			'duration'          => sanitize_text_field( $duration ),
			'postTitle'         => sanitize_text_field( $post_title ),
			'postUrl'           => esc_url( $post_url ),
			'postId'            => $post_id,
			'playCountEndpoint' => esc_url( rest_url( Rest_API::NAMESPACE . '/play-count/' . $post_id ) ),
		);

		if ( empty( trim( $content ) ) ) {
			return '';
		}

		$tags = new WP_HTML_Tag_Processor( $content );
		if ( $tags->next_tag( 'button' ) ) {
			$tags->set_attribute( 'data-wp-interactive', wp_json_encode( array( 'namespace' => 'prc-spoken-article/player' ) ) );
			$tags->set_attribute( 'data-wp-context', wp_json_encode( $context ) );
			$tags->set_attribute( 'data-wp-on--click', 'actions.requestPlay' );
		}
		if ( $tags->next_tag( array( 'class_name' => 'spoken-article-trigger__duration' ) ) ) {
			$tags->set_attribute( 'data-wp-text', 'context.duration' );
		}
		$html = $tags->get_updated_html();

		return str_replace(
			'<span class="prc-icon-placeholder" data-icon="solid/headphones"></span>',
			\PRC\Platform\Icons\render( 'solid', 'headphones' ),
			$html
		);
	}
}
