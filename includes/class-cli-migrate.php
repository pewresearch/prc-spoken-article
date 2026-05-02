<?php
/**
 * WP-CLI migration command for spoken article data.
 *
 * Migrates spoken article data from parent post meta to spoken-article CPT posts.
 *
 * @package PRC\Platform\Spoken_Article
 */

declare( strict_types=1 );

namespace PRC\Platform\Spoken_Article;

if ( ! defined( 'ABSPATH' ) || ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	return;
}

/**
 * Manages spoken article data migrations.
 */
class CLI_Migrate {

	/**
	 * Migrate spoken article data from parent post meta to spoken-article CPT posts.
	 *
	 * Creates a spoken-article CPT post for each parent post that has spoken_article meta,
	 * copies all relevant meta, moves the transcript to post_content, and sets the
	 * player_enabled toggle on the parent.
	 *
	 * ## OPTIONS
	 *
	 * [--dry-run]
	 * : Preview what would be migrated without making changes.
	 *
	 * [--batch-size=<number>]
	 * : Number of posts to process per batch. Default: 50.
	 *
	 * [--cleanup]
	 * : Remove old meta keys from parent posts after migration.
	 *
	 * ## EXAMPLES
	 *
	 *     # Preview migration
	 *     wp prc spoken-article migrate --dry-run
	 *
	 *     # Run migration
	 *     wp prc spoken-article migrate
	 *
	 *     # Run migration and clean up old meta
	 *     wp prc spoken-article migrate --cleanup
	 *
	 * @param array $args       Positional arguments.
	 * @param array $assoc_args Named arguments.
	 */
	public function migrate( $args, $assoc_args ) {
		$dry_run    = \WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$batch_size = (int) ( $assoc_args['batch-size'] ?? 50 );
		$cleanup    = \WP_CLI\Utils\get_flag_value( $assoc_args, 'cleanup', false );

		if ( $dry_run ) {
			\WP_CLI::log( '🔍 DRY RUN — no changes will be made.' );
		}

		$old_meta_keys = array(
			'spoken_article',
			'spoken_article_play_count',
			'spoken_article_transcript',
			'spoken_article_voice_id',
			'spoken_article_transcript_is_draft',
			'spoken_article_target_minutes',
			'spoken_article_generating',
			'spoken_article_interstitial',
			'spoken_article_interstitial_enabled',
		);

		$enabled_post_types = Bootstrap::get_enabled_post_types();
		$offset             = 0;
		$migrated           = 0;
		$skipped            = 0;
		$errors             = 0;

		$batch_count = 0;

		do {
			$query = new \WP_Query(
				array(
					'post_type'      => $enabled_post_types,
					'post_status'    => 'any',
					'posts_per_page' => $batch_size,
					'offset'         => $offset,
					'meta_query'     => array(
						array(
							'key'     => 'spoken_article',
							'compare' => 'EXISTS',
						),
					),
					'orderby'        => 'ID',
					'order'          => 'ASC',
					'no_found_rows'  => false,
				)
			);

			$batch_count = count( $query->posts );

			if ( 0 === $batch_count ) {
				break;
			}

			foreach ( $query->posts as $parent_post ) {
				$spoken = get_post_meta( $parent_post->ID, 'spoken_article', true );
				if ( empty( $spoken ) || empty( $spoken['attachment_id'] ) ) {
					++$skipped;
					++$offset;
					continue;
				}

				$existing = Content_Type::get_spoken_article_for_post( $parent_post->ID );
				if ( $existing ) {
					\WP_CLI::log(
						sprintf(
							'  ⏭️  Post #%d already has spoken-article #%d — skipping.',
							$parent_post->ID,
							$existing->ID
						)
					);
					++$skipped;
					++$offset;
					continue;
				}

				$transcript = get_post_meta( $parent_post->ID, 'spoken_article_transcript', true );
				$transcript = is_string( $transcript ) ? $transcript : '';

				if ( $dry_run ) {
					\WP_CLI::log(
						sprintf(
							'  Would migrate post #%d (%s) — audio: %s, transcript: %d chars',
							$parent_post->ID,
							get_the_title( $parent_post->ID ),
							$spoken['audio_url'] ?? 'none',
							strlen( $transcript )
						)
					);
					++$migrated;
					++$offset;
					continue;
				}

				$title = sprintf(
					'Spoken Article: %s',
					get_the_title( $parent_post->ID )
				);

				$new_id = wp_insert_post(
					array(
						'post_type'    => Content_Type::POST_TYPE,
						'post_parent'  => $parent_post->ID,
						'post_title'   => $title,
						'post_content' => $transcript,
						'post_status'  => 'publish',
					),
					true
				);

				if ( is_wp_error( $new_id ) ) {
					\WP_CLI::warning(
						sprintf(
							'Failed to create spoken-article for post #%d: %s',
							$parent_post->ID,
							$new_id->get_error_message()
						)
					);
					++$errors;
					++$offset;
					continue;
				}

				update_post_meta( $new_id, Post_Meta::META_KEY, $spoken );

				$meta_map = array(
					'spoken_article_play_count'           => Post_Meta::PLAY_COUNT_META_KEY,
					'spoken_article_voice_id'             => 'spoken_article_voice_id',
					'spoken_article_transcript_is_draft'  => 'spoken_article_transcript_is_draft',
					'spoken_article_target_minutes'       => Post_Meta::TARGET_MINUTES_META_KEY,
					'spoken_article_generating'           => Post_Meta::GENERATING_META_KEY,
					'spoken_article_interstitial'         => Post_Meta::INTERSTITIAL_META_KEY,
					'spoken_article_interstitial_enabled' => Post_Meta::INTERSTITIAL_ENABLED_META_KEY,
				);

				foreach ( $meta_map as $old_key => $new_key ) {
					$value = get_post_meta( $parent_post->ID, $old_key, true );
					if ( '' !== $value && false !== $value ) {
						update_post_meta( $new_id, $new_key, $value );
					}
				}

				update_post_meta( $parent_post->ID, Post_Meta::PLAYER_ENABLED_META_KEY, true );

				if ( $cleanup ) {
					foreach ( $old_meta_keys as $key ) {
						delete_post_meta( $parent_post->ID, $key );
					}
				}

				\WP_CLI::log(
					sprintf(
						'  ✅ Post #%d → spoken-article #%d',
						$parent_post->ID,
						$new_id
					)
				);
				++$migrated;
				++$offset;
			}

			if ( ! $dry_run && function_exists( 'vip_inmemory_cleanup' ) ) {
				vip_inmemory_cleanup();
			}
		} while ( $batch_count === $batch_size );

		\WP_CLI::success(
			sprintf(
				'Migration %s: %d migrated, %d skipped, %d errors.',
				$dry_run ? 'preview' : 'complete',
				$migrated,
				$skipped,
				$errors
			)
		);
	}
}
