<?php
/**
 * Plugin Name:       PRC Spoken Article
 * Plugin URI:        https://pewresearch.org
 * Description:       Audio player block for AI-generated spoken article narration.
 * Author:            Seth Rubenstein
 * Author URI:        https://www.pewresearch.org
 * Version:           1.0.0
 * Requires at least: 6.7
 * Requires PHP:      8.1
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       prc-spoken-article
 *
 * @package           PRC\Platform\Spoken_Article
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'PRC_SPOKEN_ARTICLE_FILE', __FILE__ );
define( 'PRC_SPOKEN_ARTICLE_DIR', __DIR__ );
define( 'PRC_SPOKEN_ARTICLE_BLOCKS_DIR', __DIR__ . '/build' );
define( 'PRC_SPOKEN_ARTICLE_VERSION', '1.0.0' );

/**
 * The core plugin class that is used to define the hooks that initialize the various platform components.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-bootstrap.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function run_prc_spoken_article() {
	$plugin = new \PRC\Platform\Spoken_Article\Bootstrap();
	$plugin->run();
}
run_prc_spoken_article();
