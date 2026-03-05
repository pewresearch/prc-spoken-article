<?php
/**
 * WP Admin — editor sidebar assets.
 *
 * @package PRC\Platform\Spoken_Article
 */

namespace PRC\Platform\Spoken_Article;

/**
 * Registers and enqueues the Spoken Article editor sidebar panel
 * and localizes ElevenLabs / REST configuration.
 */
class WP_Admin {

	/**
	 * Script handle.
	 *
	 * @var string
	 */
	public static $handle = 'prc-spoken-article-sidebar';

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( $loader ) {
		$loader->add_action( 'enqueue_block_editor_assets', $this, 'enqueue_panel_assets' );
	}

	/**
	 * Register the sidebar panel assets.
	 *
	 * @return \WP_Error|true
	 */
	public function register_panel_assets() {
		$asset_file = PRC_SPOKEN_ARTICLE_DIR . '/build/sidebar/index.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return new \WP_Error( self::$handle, 'Asset file not found. Run npm run build first.' );
		}
		$asset = require $asset_file;

		$script = wp_register_script(
			self::$handle,
			plugins_url( 'build/sidebar/index.js', PRC_SPOKEN_ARTICLE_FILE ),
			$asset['dependencies'],
			$asset['version'],
			true
		);

		if ( ! $script ) {
			return new \WP_Error( self::$handle, 'Failed to register sidebar script.' );
		}

		if ( file_exists( PRC_SPOKEN_ARTICLE_DIR . '/build/sidebar/index.css' ) ) {
			wp_register_style(
				self::$handle,
				plugins_url( 'build/sidebar/index.css', PRC_SPOKEN_ARTICLE_FILE ),
				array(),
				$asset['version']
			);
		}

		return true;
	}

	/**
	 * Enqueue editor sidebar assets for supported post types.
	 *
	 * @hook enqueue_block_editor_assets
	 */
	public function enqueue_panel_assets() {
		$screen = get_current_screen();
		if ( ! $screen || 'post' !== $screen->base ) {
			return;
		}

		if ( ! post_type_supports( $screen->post_type, Bootstrap::POST_TYPE_SUPPORT ) ) {
			return;
		}

		$registered = $this->register_panel_assets();
		if ( is_wp_error( $registered ) ) {
			return;
		}

		wp_enqueue_script( self::$handle );
		wp_enqueue_style( self::$handle );

		wp_localize_script(
			self::$handle,
			'PRCSpokenArticleConfig',
			array(
				'restBase'  => rest_url( Rest_API::NAMESPACE ),
				'restNonce' => wp_create_nonce( 'wp_rest' ),
			)
		);

		$api_key = defined( 'PRC_PLATFORM_ELEVENLABS_API_KEY' ) ? PRC_PLATFORM_ELEVENLABS_API_KEY : '';

		wp_localize_script(
			self::$handle,
			'PRCSpokenArticleAI',
			array(
				'enabled'    => true,
				'elevenlabs' => array(
					'apiKey'          => $api_key,
					'voiceId'         => get_option( 'elevenlabs_voice_id', 'EXAVITQu4vr4xnSDxMaL' ),
					'model'           => get_option( 'elevenlabs_model', 'eleven_monolingual_v1' ),
					'stability'       => (float) get_option( 'elevenlabs_stability', 0.5 ),
					'similarityBoost' => (float) get_option( 'elevenlabs_similarity_boost', 0.75 ),
				),
				'restBase'   => rest_url( Rest_API::NAMESPACE ),
				'mediaUrl'   => rest_url( 'wp/v2/media' ),
				'restNonce'  => wp_create_nonce( 'wp_rest' ),
			)
		);
	}
}
