<?php
/**
 * Plugin bootstrap class.
 *
 * @package PRC\Platform\Spoken_Article
 */

namespace PRC\Platform\Spoken_Article;

/**
 * The core plugin class, responsible for loading dependencies and registering hooks.
 *
 * @since      1.0.0
 * @package    PRC\Platform\Spoken_Article
 */
class Bootstrap {

	const POST_TYPE_SUPPORT = 'prc-spoken-article';

	/**
	 * The loader that's responsible for maintaining and registering all hooks.
	 *
	 * @var Loader
	 */
	protected $loader;

	/**
	 * Define the core functionality.
	 *
	 * @since    1.0.0
	 */
	public function __construct() {
		$this->load_dependencies();
		$this->init_dependencies();
	}

	/**
	 * Load the required dependencies.
	 *
	 * @since    1.0.0
	 */
	private function load_dependencies() {
		require_once plugin_dir_path( __DIR__ ) . 'includes/class-loader.php';

		$this->loader = new Loader();

		require_once plugin_dir_path( __DIR__ ) . 'includes/class-post-meta.php';
		require_once plugin_dir_path( __DIR__ ) . 'includes/class-rest-api.php';
		require_once plugin_dir_path( __DIR__ ) . 'includes/class-schema.php';
		require_once plugin_dir_path( __DIR__ ) . 'includes/class-wp-admin.php';

		$dev_mode        = 'local' === wp_get_environment_type();
		$block_src       = $dev_mode ? 'src' : 'build';
		$block_file_path = plugin_dir_path( __DIR__ ) . $block_src . '/player-block/class-player-block.php';
		if ( file_exists( $block_file_path ) ) {
			require_once $block_file_path;
		}
	}

	/**
	 * Initialize the dependencies.
	 *
	 * @since    1.0.0
	 */
	private function init_dependencies() {
		$this->loader->add_action( 'init', $this, 'register_default_post_type_support', 5 );

		new Post_Meta( $this->get_loader() );
		new Rest_API( $this->get_loader() );
		new Schema( $this->get_loader() );
		new WP_Admin( $this->get_loader() );
		new Player_Block( $this->get_loader() );
	}

	/**
	 * Register default post type support.
	 *
	 * @hook init 5
	 */
	public function register_default_post_type_support() {
		add_post_type_support( 'post', self::POST_TYPE_SUPPORT );
	}

	/**
	 * Get the enabled post types for prc-spoken-article support.
	 *
	 * @return string[]
	 */
	public static function get_enabled_post_types() {
		$post_types = get_post_types( array( 'public' => true ), 'names' );

		return array_values(
			array_filter(
				$post_types,
				function ( $pt ) {
					return post_type_supports( $pt, self::POST_TYPE_SUPPORT );
				}
			)
		);
	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since    1.0.0
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * Get the loader instance.
	 *
	 * @since    1.0.0
	 * @return Loader
	 */
	public function get_loader() {
		return $this->loader;
	}
}
