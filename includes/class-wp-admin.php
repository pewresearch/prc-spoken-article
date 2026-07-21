<?php
/**
 * WP Admin — editor sidebar assets.
 *
 * @package PRC\Platform\Spoken_Article
 */

declare( strict_types=1 );

namespace PRC\Platform\Spoken_Article;

/**
 * Registers and enqueues the editor sidebar assets:
 * - Parent sidebar for supported content post types.
 * - Document sidebar for the spoken-article CPT editor.
 */
class WP_Admin {

	/**
	 * Script handle for the parent post sidebar.
	 *
	 * @var string
	 */
	public static $parent_handle = 'prc-spoken-article-parent-sidebar';

	/**
	 * Script handle for the spoken-article CPT document sidebar.
	 *
	 * @var string
	 */
	public static $document_handle = 'prc-spoken-article-document-sidebar';

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( $loader ) {
		$loader->add_action( 'enqueue_block_editor_assets', $this, 'enqueue_panel_assets' );
	}

	/**
	 * Enqueue editor sidebar assets for the appropriate context.
	 *
	 * @hook enqueue_block_editor_assets
	 */
	public function enqueue_panel_assets(): void {
		$screen = get_current_screen();
		if ( ! $screen || 'post' !== $screen->base ) {
			return;
		}

		if ( Content_Type::POST_TYPE === $screen->post_type ) {
			$this->enqueue_document_sidebar();
			return;
		}

		if ( post_type_supports( $screen->post_type, Bootstrap::POST_TYPE_SUPPORT ) ) {
			$this->enqueue_parent_sidebar();
		}
	}

	/**
	 * Enqueue the parent post sidebar script.
	 */
	private function enqueue_parent_sidebar(): void {
		$asset_file = PRC_SPOKEN_ARTICLE_DIR . '/build/parent-sidebar/index.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}
		$asset = require $asset_file;

		$registered = wp_register_script(
			self::$parent_handle,
			plugins_url( 'build/parent-sidebar/index.js', PRC_SPOKEN_ARTICLE_FILE ),
			$asset['dependencies'],
			$asset['version'],
			true
		);

		if ( ! $registered ) {
			return;
		}

		if ( file_exists( PRC_SPOKEN_ARTICLE_DIR . '/build/parent-sidebar/index.css' ) ) {
			wp_register_style(
				self::$parent_handle,
				plugins_url( 'build/parent-sidebar/index.css', PRC_SPOKEN_ARTICLE_FILE ),
				array(),
				$asset['version']
			);
		}

		wp_enqueue_script( self::$parent_handle );
		wp_enqueue_style( self::$parent_handle );

		wp_localize_script(
			self::$parent_handle,
			'PRCSpokenArticleConfig',
			$this->get_config_data()
		);
	}

	/**
	 * Enqueue the document sidebar script for the spoken-article CPT.
	 */
	private function enqueue_document_sidebar(): void {
		$asset_file = PRC_SPOKEN_ARTICLE_DIR . '/build/document-sidebar/index.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}
		$asset = require $asset_file;

		$registered = wp_register_script(
			self::$document_handle,
			plugins_url( 'build/document-sidebar/index.js', PRC_SPOKEN_ARTICLE_FILE ),
			$asset['dependencies'],
			$asset['version'],
			true
		);

		if ( ! $registered ) {
			return;
		}

		if ( file_exists( PRC_SPOKEN_ARTICLE_DIR . '/build/document-sidebar/index.css' ) ) {
			wp_register_style(
				self::$document_handle,
				plugins_url( 'build/document-sidebar/index.css', PRC_SPOKEN_ARTICLE_FILE ),
				array(),
				$asset['version']
			);
		}

		wp_enqueue_script( self::$document_handle );
		wp_enqueue_style( self::$document_handle );

		wp_localize_script(
			self::$document_handle,
			'PRCSpokenArticleConfig',
			$this->get_config_data()
		);

		wp_localize_script(
			self::$document_handle,
			'PRCSpokenArticleAI',
			array(
				'enabled'    => true,
				'elevenlabs' => ElevenLabs_Settings::get_localize_config(),
				'restBase'   => rest_url( Rest_API::NAMESPACE ),
				'mediaUrl'   => rest_url( 'wp/v2/media' ),
				'restNonce'  => wp_create_nonce( 'wp_rest' ),
			)
		);
	}

	/**
	 * Shared config data for both sidebars.
	 *
	 * @return array<string, mixed>
	 */
	private function get_config_data(): array {
		$current_user = wp_get_current_user();

		return array(
			'restBase'             => rest_url( Rest_API::NAMESPACE ),
			'restNonce'            => wp_create_nonce( 'wp_rest' ),
			'interstitialAdminUrl' => current_user_can( 'manage_options' )
				? admin_url( 'options-general.php?page=spoken-article-interstitials' )
				: '',
			'userId'               => get_current_user_id(),
			'userName'             => $current_user && $current_user->exists() ? $current_user->display_name : '',
		);
	}
}
