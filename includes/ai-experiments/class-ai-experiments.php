<?php
/**
 * AI Experiments class.
 *
 * @package PRC\Platform\Spoken_Article
 */

namespace PRC\Platform\Spoken_Article;

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * AI Experiments class.
 */
class AI_Experiments {

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader that's responsible for maintaining and registering all hooks that power the plugin.
	 */
	public function __construct( $loader ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- reserved for parity with block library AI_Experiments
		// After WP AI plugins_loaded bootstrap (priority 10); Abstract_Feature is not autoloadable before that.
		add_action( 'plugins_loaded', array( $this, 'register_wp_ai_features' ), 11 );
	}

	/**
	 * Load spoken-article AI experiment classes and register features with the WP AI plugin.
	 *
	 * @return void
	 */
	public function register_wp_ai_features() {
		if ( ! class_exists( '\WordPress\AI\Abstracts\Abstract_Feature' ) ) {
			return;
		}

		require_once plugin_dir_path( __FILE__ ) . '/class-generate-spoken-article.php';
		require_once plugin_dir_path( __FILE__ ) . '/class-generate-spoken-article-experiment.php';

		add_action(
			'wpai_register_features',
			function ( $registry ) {
				$registry->register_feature( new \PRC\Platform\Spoken_Article\AI_Experiments\Generate_Spoken_Article_Experiment() );
			}
		);
	}
}
