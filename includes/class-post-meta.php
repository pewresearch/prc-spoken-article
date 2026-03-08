<?php
/**
 * Post Meta registration.
 *
 * @package PRC\Platform\Spoken_Article
 */

namespace PRC\Platform\Spoken_Article;

/**
 * Registers spoken_article and spoken_article_play_count post meta
 * for all post types that declare prc-spoken-article support.
 */
class Post_Meta {

	const META_KEY            = 'spoken_article';
	const PLAY_COUNT_META_KEY = 'spoken_article_play_count';

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( $loader ) {
		$loader->add_action( 'init', $this, 'register_post_meta' );
	}

	/**
	 * Register spoken article post meta for all supporting post types.
	 *
	 * @hook init
	 */
	public function register_post_meta() {
		$post_types = Bootstrap::get_enabled_post_types();
		foreach ( $post_types as $post_type ) {
			register_post_meta(
				$post_type,
				self::META_KEY,
				array(
					'single'        => true,
					'type'          => 'object',
					'description'   => 'Spoken article audio data.',
					'default'       => array(
						'attachment_id' => 0,
						'audio_url'     => '',
						'duration'      => '',
					),
					'show_in_rest'  => array(
						'schema' => array(
							'type'       => 'object',
							'properties' => array(
								'attachment_id' => array(
									'type'    => 'integer',
									'default' => 0,
								),
								'audio_url'     => array(
									'type'    => 'string',
									'format'  => 'uri',
									'default' => '',
								),
								'duration'      => array(
									'type'    => 'string',
									'default' => '',
								),
							),
						),
					),
					'auth_callback' => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			register_post_meta(
				$post_type,
				self::PLAY_COUNT_META_KEY,
				array(
					'single'            => true,
					'type'              => 'integer',
					'description'       => 'Number of times the spoken article has been played.',
					'default'           => 0,
					'show_in_rest'      => true,
					'sanitize_callback' => 'absint',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			register_post_meta(
				$post_type,
				'spoken_article_transcript',
				array(
					'single'              => true,
					'type'                => 'string',
					'description'         => 'Draft transcript text for the spoken article.',
					'default'             => '',
					'show_in_rest'        => true,
					'sanitize_callback'   => 'sanitize_textarea_field',
					'auth_callback'       => function () {
						return current_user_can( 'edit_posts' );
					},
					'revisions_enabled'   => true,
				)
			);

			register_post_meta(
				$post_type,
				'spoken_article_voice_id',
				array(
					'single'            => true,
					'type'              => 'string',
					'description'       => 'ElevenLabs voice ID for this post.',
					'default'           => '',
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			register_post_meta(
				$post_type,
				'spoken_article_transcript_is_draft',
				array(
					'single'            => true,
					'type'              => 'boolean',
					'description'       => 'Whether the transcript is a saved draft (not yet used for audio generation).',
					'default'           => false,
					'show_in_rest'      => true,
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
					'revisions_enabled' => true,
				)
			);
		}
	}
}
