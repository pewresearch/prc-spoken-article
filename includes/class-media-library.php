<?php
/**
 * Media Library — hide spoken article audio from the media library.
 *
 * @package PRC\Platform\Spoken_Article
 */

namespace PRC\Platform\Spoken_Article;

/**
 * Hides spoken article audio attachments from media library queries.
 */
class Media_Library {

	const META_KEY = 'isSpokenArticleAudio';

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( $loader ) {
		$loader->add_action( 'init', $this, 'register_media_meta' );
		$loader->add_filter( 'rest_attachment_query', $this, 'hide_from_rest', 10, 2 );
		$loader->add_filter( 'ajax_query_attachments_args', $this, 'hide_from_media_library' );
	}

	/**
	 * Register attachment meta used to flag spoken article audio files.
	 *
	 * @hook init
	 */
	public function register_media_meta() {
		register_meta(
			'post',
			self::META_KEY,
			array(
				'object_subtype' => 'attachment',
				'type'           => 'boolean',
				'description'    => 'Is this attachment a spoken article audio file?',
				'single'         => true,
				'show_in_rest'   => true,
			)
		);
	}

	/**
	 * Exclude spoken article audio from REST attachment queries (block editor media modal).
	 *
	 * @hook rest_attachment_query
	 *
	 * @param array            $args    WP_Query arguments.
	 * @param \WP_REST_Request $request The REST request.
	 * @return array
	 */
	public function hide_from_rest( $args, $request ) {
		if ( ! isset( $args['meta_query'] ) ) {
			$args['meta_query'] = array();
		}

		$args['meta_query'][] = array(
			'relation' => 'OR',
			array(
				'key'     => self::META_KEY,
				'compare' => 'NOT EXISTS',
			),
			array(
				'key'     => self::META_KEY,
				'value'   => '1',
				'compare' => '!=',
			),
		);

		return $args;
	}

	/**
	 * Exclude spoken article audio from the wp-admin AJAX media library grid.
	 *
	 * @hook ajax_query_attachments_args
	 *
	 * @param array $query_args WP_Query arguments.
	 * @return array
	 */
	public function hide_from_media_library( $query_args ) {
		if ( ! isset( $query_args['meta_query'] ) ) {
			$query_args['meta_query'] = array();
		}

		$query_args['meta_query'][] = array(
			'relation' => 'OR',
			array(
				'key'     => self::META_KEY,
				'compare' => 'NOT EXISTS',
			),
		);

		return $query_args;
	}
}
