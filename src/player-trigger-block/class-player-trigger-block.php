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
 * Renders the trigger that opens the spoken article player. The trigger wraps
 * its inner blocks; a core/button link inside it, or else the whole inner
 * content, starts playback.
 * Queries the spoken-article CPT for audio data, respects the player-enabled toggle.
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

		$post = get_post( $post_id );
		if ( ! $post || $post->post_parent > 0 ) {
			return '';
		}

		$player_enabled = get_post_meta( $post_id, Post_Meta::PLAYER_ENABLED_META_KEY, true );
		if ( '' !== $player_enabled && ! $player_enabled ) {
			return '';
		}

		$audio = Content_Type::get_audio_for_post( $post_id );
		if ( ! $audio ) {
			return '';
		}

		$audio_url  = $audio['audio_url'];
		$duration   = $audio['duration'] ?? '';
		$post_title = get_the_title( $post_id );
		$post_url   = get_permalink( $post_id );
		$context    = array(
			'audioUrl'          => esc_url( $audio_url ),
			'duration'          => sanitize_text_field( $duration ),
			'postTitle'         => sanitize_text_field( $post_title ),
			'postUrl'           => esc_url( $post_url ),
			'postId'            => $post_id,
			'playCountEndpoint' => esc_url( rest_url( Rest_API::NAMESPACE . '/play-count/' . $post_id ) ),
		);

		$interstitial = Interstitial_Ads::get_interstitial_for_post( $post_id );
		if ( $interstitial ) {
			$context['interstitialAudioUrl'] = esc_url( $interstitial['audioUrl'] );
			$context['interstitialDuration'] = sanitize_text_field( $interstitial['duration'] );
		} else {
			$context['interstitialAudioUrl'] = '';
			$context['interstitialDuration'] = '';
		}

		if ( empty( trim( $content ) ) ) {
			return '';
		}

		$aria_label = '' !== $context['duration']
			/* translators: %s: audio runtime, e.g. 4:12. */
			? sprintf( __( 'Listen to this article, %s', 'prc-spoken-article' ), $context['duration'] )
			: __( 'Listen to this article', 'prc-spoken-article' );

		if ( self::is_legacy_markup( $content ) ) {
			$content = self::render_default_template();
		}

		$inner = self::bind_button_link( $content, $aria_label, $context['duration'] );
		if ( null === $inner ) {
			$inner = sprintf(
				'<div class="wp-block-prc-spoken-article-player-trigger__target" role="button" tabindex="0" aria-label="%1$s" data-wp-on--click="actions.requestPlay" data-wp-on--keydown="actions.onTriggerKeydown">%2$s</div>',
				esc_attr( $aria_label ),
				$content
			);
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'data-wp-interactive' => wp_json_encode( array( 'namespace' => 'prc-spoken-article/player' ) ),
				'data-wp-context'     => wp_json_encode( $context ),
			)
		);

		return sprintf(
			'<div %1$s>%2$s</div>',
			$wrapper_attributes,
			$inner
		);
	}

	/**
	 * Whether the content is the static button the block saved before it
	 * became an InnerBlocks wrapper. Posts keep that markup until an editor
	 * opens and re-saves them.
	 *
	 * @param string $content Saved block HTML.
	 * @return bool
	 */
	private static function is_legacy_markup( $content ) {
		$tags = new WP_HTML_Tag_Processor( $content );
		return $tags->next_tag( array( 'class_name' => 'spoken-article-trigger__duration' ) );
	}

	/**
	 * Render the editor's default inner blocks: a Listen button with a headphones icon.
	 *
	 * @return string Rendered HTML.
	 */
	private static function render_default_template() {
		$button_attrs = wp_json_encode(
			array(
				'tagName'      => 'button',
				'hasIcon'      => true,
				'iconLibrary'  => 'prc',
				'iconName'     => 'headphones',
				'iconPosition' => 'left',
			)
		);

		return do_blocks(
			sprintf(
				'<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button %1$s --><div class="wp-block-button"><button type="button" class="wp-block-button__link wp-element-button">%2$s</button></div><!-- /wp:button --></div><!-- /wp:buttons -->',
				$button_attrs,
				esc_html__( 'Listen', 'prc-spoken-article' )
			)
		);
	}

	/**
	 * Wire the first core/button link in the inner content to the player.
	 *
	 * The Tag Processor can only change attributes, so the visible runtime is
	 * drawn by CSS from data-spoken-article-duration.
	 *
	 * @param string $content    Inner blocks HTML.
	 * @param string $aria_label Accessible label for the link.
	 * @param string $duration   Audio runtime, e.g. 4:12.
	 * @return string|null Updated HTML, or null when the content has no button link.
	 */
	private static function bind_button_link( $content, $aria_label, $duration ) {
		$tags = new WP_HTML_Tag_Processor( $content );
		while ( $tags->next_tag() ) {
			if ( ! in_array( $tags->get_tag(), array( 'A', 'BUTTON' ), true ) || ! $tags->has_class( 'wp-block-button__link' ) ) {
				continue;
			}

			$tags->set_attribute( 'data-wp-on--click', 'actions.requestPlay' );
			$tags->set_attribute( 'aria-label', $aria_label );
			if ( '' !== $duration ) {
				$tags->set_attribute( 'data-spoken-article-duration', $duration );
			}

			if ( 'A' === $tags->get_tag() ) {
				$href = trim( (string) $tags->get_attribute( 'href' ) );
				if ( '' === $href || '#' === $href ) {
					$tags->remove_attribute( 'href' );
					$tags->set_attribute( 'role', 'button' );
					$tags->set_attribute( 'tabindex', '0' );
					$tags->set_attribute( 'data-wp-on--keydown', 'actions.onTriggerKeydown' );
				}
			}

			return $tags->get_updated_html();
		}

		return null;
	}
}
