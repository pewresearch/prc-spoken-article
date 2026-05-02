<?php
/**
 * Generate Spoken Article AI Experiment.
 *
 * Registers the Spoken Article experiment with the WordPress AI Experiments
 * plugin. When enabled, this experiment registers the generate-spoken-article
 * ability and enqueues a separate editor script that uses the `editor.BlockEdit`
 * filter to inject an AI generation panel into the Spoken Article block inspector.
 *
 * @package PRC\Platform\Spoken_Article\AI_Experiments
 */

namespace PRC\Platform\Spoken_Article\AI_Experiments;

use WordPress\AI\Abstracts\Abstract_Feature;
use WordPress\AI\Experiments\Experiment_Category;

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Generate Spoken Article AI Experiment class.
 */
class Generate_Spoken_Article_Experiment extends Abstract_Feature {

	/**
	 * Feature identifier.
	 */
	public static function get_id(): string {
		return 'generate-spoken-article';
	}

	/**
	 * Loads feature metadata.
	 *
	 * @return array{label: string, description: string, category: string} Feature metadata.
	 */
	protected function load_metadata(): array {
		return array(
			'label'       => __( 'Spoken Article Generation', 'prc-spoken-article' ),
			'description' => __( 'Uses AI to generate spoken audio narration from post text content. Adds an "Generate with AI" capability to the Spoken Article block in the editor.', 'prc-spoken-article' ),
			'category'    => Experiment_Category::EDITOR,
		);
	}

	/**
	 * Registers the experiment's hooks and functionality.
	 *
	 * This method is only called when the experiment is enabled.
	 */
	public function register(): void {
		// Register the server-side AI ability.
		$ability = new Generate_Spoken_Article();
		add_action( 'wp_abilities_api_init', array( $ability, 'register_ability' ) );

		// Enqueue the experiment's editor script (the BlockEdit filter + panel).
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_experiment_assets' ) );
	}

	/**
	 * Enqueues the experiment's editor script and localizes configuration.
	 *
	 * The script registers an `editor.BlockEdit` filter that wraps the
	 * prc-spoken-article/player edit component to inject an AI generation panel
	 * into the inspector sidebar. This keeps the spoken-article block's own code
	 * completely unaware of the AI experiment.
	 *
	 * @hook enqueue_block_editor_assets
	 */
	public function enqueue_experiment_assets(): void {
		$asset_file = PRC_SPOKEN_ARTICLE_DIR . '/includes/ai-experiments/build/generate-spoken-article/index.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}
		$asset = require $asset_file;

		wp_enqueue_script(
			'prc-spoken-article-ai-experiment',
			plugins_url( 'includes/ai-experiments/build/generate-spoken-article/index.js', PRC_SPOKEN_ARTICLE_FILE ),
			array_merge( $asset['dependencies'], array( 'wp-ai-client' ) ),
			$asset['version'],
			true
		);

		wp_localize_script(
			'prc-spoken-article-ai-experiment',
			'PRCSpokenArticleAI',
			array(
				'enabled'     => true,
				'abilityName' => Generate_Spoken_Article::$ability_name,
			)
		);
	}
}
