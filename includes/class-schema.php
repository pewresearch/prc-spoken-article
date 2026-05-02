<?php
/**
 * Schema.org AudioObject integration.
 *
 * @package PRC\Platform\Spoken_Article
 */

declare( strict_types=1 );

namespace PRC\Platform\Spoken_Article;

/**
 * Adds AudioObject markup to the post schema via the prc-schema-seo filter.
 * Queries the spoken-article CPT for audio data.
 */
class Schema {

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( $loader ) {
		$loader->add_filter( 'prc_schema_seo_post_schema', $this, 'add_audio_schema', 10, 3 );
	}

	/**
	 * Add AudioObject schema to post schema.
	 *
	 * @hook prc_schema_seo_post_schema
	 * @param object $schema The schema object (Spatie schema object).
	 * @param int    $post_id The post ID.
	 * @param array  $seo_data SEO metadata.
	 * @return object Modified schema object.
	 */
	public function add_audio_schema( $schema, $post_id, $seo_data ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
		// @TODO: Right now this is in BETA mode, so we only want to show the schema to logged in users.
		if ( ! is_user_logged_in() ) {
			return $schema;
		}

		$post = get_post( $post_id );
		if ( ! $post || ! post_type_supports( $post->post_type, Bootstrap::POST_TYPE_SUPPORT ) ) {
			return $schema;
		}

		$audio = Content_Type::get_audio_for_post( $post_id );
		if ( ! $audio ) {
			return $schema;
		}

		if ( method_exists( $schema, 'audio' ) ) {
			$audio_schema = array(
				'@type'          => 'AudioObject',
				'contentUrl'     => esc_url( $audio['audio_url'] ),
				'encodingFormat' => 'audio/mpeg',
				'name'           => get_the_title( $post_id ),
				'description'    => __( 'Spoken article narration', 'prc-spoken-article' ),
			);

			if ( ! empty( $audio['duration'] ) ) {
				$audio_schema['duration'] = $this->duration_to_iso8601( $audio['duration'] );
			}

			$schema->audio( $audio_schema );
		}

		return $schema;
	}

	/**
	 * Convert a human-readable duration (e.g. "9:28") to ISO 8601 format.
	 *
	 * @param string $duration Human-readable duration.
	 * @return string ISO 8601 duration (e.g. "PT9M28S").
	 */
	private function duration_to_iso8601( string $duration ): string {
		$parts = explode( ':', $duration );
		if ( count( $parts ) === 2 ) {
			return sprintf( 'PT%dM%dS', (int) $parts[0], (int) $parts[1] );
		}
		if ( count( $parts ) === 3 ) {
			return sprintf( 'PT%dH%dM%dS', (int) $parts[0], (int) $parts[1], (int) $parts[2] );
		}
		return $duration;
	}
}
