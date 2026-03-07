<?php
/**
 * Player Add to Queue Block
 *
 * @package PRC\Platform\Spoken_Article
 */

namespace PRC\Platform\Spoken_Article;

use WP_Block;
use WP_HTML_Tag_Processor;

/**
 * Renders the add-to-queue button for a spoken article.
 * Intended for placement inside a content-gate block with allowPassThrough.
 * Reads post meta for audio context.
 */
class Player_Add_To_Queue_Block {

	/**
	 * Block name
	 *
	 * @var string
	 */
	public static $block_name = 'prc-spoken-article/player-add-to-queue';

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
			PRC_SPOKEN_ARTICLE_BLOCKS_DIR . '/player-add-to-queue-block',
			array(
				'render_callback' => array( $this, 'render_block_callback' ),
			)
		);
	}

	/**
	 * Render callback for the block.
	 *
	 * @param array    $attributes Block attributes.
	 * @param string   $content Block content.
	 * @param WP_Block $block Block instance.
	 * @return string Rendered block HTML.
	 */
	public function render_block_callback( $attributes, $content, $block ) {
		if ( is_admin() ) {
			return '';
		}

		if ( ! is_user_logged_in() ) {
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
			$tags->set_attribute( 'data-wp-on--click', 'actions.addToQueue' );
		}
		if ( $tags->next_tag( array( 'class_name' => 'player-add-to-queue__toast' ) ) ) {
			$tags->set_attribute( 'data-wp-bind--hidden', '!state.queueAddedToast' );
			$tags->set_attribute( 'data-wp-text', 'state.queueAddedToast' );
		}
		$html = $tags->get_updated_html();

		return str_replace(
			'<span class="prc-icon-placeholder" data-icon="solid/list"></span>',
			\PRC\Platform\Icons\render( 'solid', 'list' ),
			$html
		);
	}
}
