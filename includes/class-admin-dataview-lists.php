<?php
/**
 * Registers the Spoken Articles DataViews admin list.
 *
 * @package PRC\Platform\Spoken_Article
 */

declare( strict_types=1 );

namespace PRC\Platform\Spoken_Article;

/**
 * Soft-depends on prc-wp-admin-dataview via the register_lists action.
 */
class Admin_Dataview_Lists {
	/**
	 * Constructor.
	 *
	 * @param Loader $loader Plugin loader.
	 */
	public function __construct( $loader ) {
		$loader->add_action( 'prc_wp_admin_dataview_register_lists', $this, 'register_lists', 10, 1 );
	}

	/**
	 * Register the spoken-article list config.
	 *
	 * @param object $lists List registry from prc-wp-admin-dataview.
	 */
	public function register_lists( $lists ): void {
		if ( ! is_object( $lists ) || ! method_exists( $lists, 'register' ) ) {
			return;
		}

		foreach ( self::list_configs() as $config ) {
			$lists->register( $config );
		}
	}

	/**
	 * List configs owned by this plugin.
	 *
	 * @return array<int, array<string, string>>
	 */
	public static function list_configs(): array {
		return array(
			array(
				'postType'  => Content_Type::POST_TYPE,
				'pageSlug'  => 'prc-wp-admin-dataview-spoken-article',
				'menuTitle' => __( 'All Spoken Articles', 'prc-spoken-article' ),
				'pageTitle' => __( 'All Spoken Articles', 'prc-spoken-article' ),
			),
		);
	}
}
