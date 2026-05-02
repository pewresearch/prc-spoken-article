<?php
/**
 * Post Meta registration.
 *
 * @package PRC\Platform\Spoken_Article
 */

declare( strict_types=1 );

namespace PRC\Platform\Spoken_Article;

/**
 * Registers spoken article post meta on the spoken-article CPT,
 * and the player-enabled toggle on parent content post types.
 */
class Post_Meta {

	const META_KEY                      = 'spoken_article';
	const PLAY_COUNT_META_KEY           = 'spoken_article_play_count';
	const INTERSTITIAL_META_KEY         = 'spoken_article_interstitial';
	const INTERSTITIAL_ENABLED_META_KEY = 'spoken_article_interstitial_enabled';
	const GENERATING_META_KEY           = 'spoken_article_generating';
	const TARGET_MINUTES_META_KEY       = 'spoken_article_target_minutes';
	const PLAYER_ENABLED_META_KEY       = 'spoken_article_player_enabled';

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( $loader ) {
		$loader->add_action( 'init', $this, 'register_post_meta' );
	}

	/**
	 * Register post meta.
	 *
	 * Audio/voice/generation meta lives on the spoken-article CPT.
	 * The player-enabled toggle lives on parent content post types.
	 *
	 * @hook init
	 */
	public function register_post_meta(): void {
		$this->register_spoken_article_cpt_meta();
		$this->register_parent_post_meta();
	}

	/**
	 * Register meta keys on the spoken-article CPT.
	 */
	private function register_spoken_article_cpt_meta(): void {
		$post_type = Content_Type::POST_TYPE;

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
			'spoken_article_voice_id',
			array(
				'single'            => true,
				'type'              => 'string',
				'description'       => 'ElevenLabs voice ID for this spoken article.',
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

		register_post_meta(
			$post_type,
			self::INTERSTITIAL_META_KEY,
			array(
				'single'        => true,
				'type'          => 'object',
				'description'   => 'Per-article interstitial ad audio data.',
				'default'       => array(
					'text'         => '',
					'textIsDraft'  => false,
					'audioUrl'     => '',
					'attachmentId' => 0,
					'duration'     => '',
					'voiceId'      => '',
				),
				'show_in_rest'  => array(
					'schema' => array(
						'type'       => 'object',
						'properties' => array(
							'text'         => array(
								'type'    => 'string',
								'default' => '',
							),
							'textIsDraft'  => array(
								'type'    => 'boolean',
								'default' => false,
							),
							'audioUrl'     => array(
								'type'    => 'string',
								'format'  => 'uri',
								'default' => '',
							),
							'attachmentId' => array(
								'type'    => 'integer',
								'default' => 0,
							),
							'duration'     => array(
								'type'    => 'string',
								'default' => '',
							),
							'voiceId'      => array(
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
			self::INTERSTITIAL_ENABLED_META_KEY,
			array(
				'single'        => true,
				'type'          => 'boolean',
				'description'   => 'Whether a per-article interstitial overrides the global pool.',
				'default'       => false,
				'show_in_rest'  => true,
				'auth_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
			)
		);

		register_post_meta(
			$post_type,
			self::TARGET_MINUTES_META_KEY,
			array(
				'single'            => true,
				'type'              => 'number',
				'description'       => 'Target audio length in minutes used for the last AI transcript generation.',
				'default'           => 4.0,
				'show_in_rest'      => true,
				'sanitize_callback' => function ( $value ) {
					return max( 1.0, min( 8.0, (float) $value ) );
				},
				'auth_callback'     => function () {
					return current_user_can( 'edit_posts' );
				},
			)
		);

		register_post_meta(
			$post_type,
			self::GENERATING_META_KEY,
			array(
				'single'        => true,
				'type'          => 'object',
				'description'   => 'RTC-visible lock while ElevenLabs audio generation is in progress.',
				'default'       => array(
					'active'    => false,
					'userId'    => 0,
					'userName'  => '',
					'startedAt' => '',
				),
				'show_in_rest'  => array(
					'schema' => array(
						'type'       => 'object',
						'properties' => array(
							'active'    => array(
								'type'    => 'boolean',
								'default' => false,
							),
							'userId'    => array(
								'type'    => 'integer',
								'default' => 0,
							),
							'userName'  => array(
								'type'    => 'string',
								'default' => '',
							),
							'startedAt' => array(
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
	}

	/**
	 * Register the player-enabled toggle on all parent content post types.
	 */
	private function register_parent_post_meta(): void {
		$post_types = Bootstrap::get_enabled_post_types();
		foreach ( $post_types as $post_type ) {
			register_post_meta(
				$post_type,
				self::PLAYER_ENABLED_META_KEY,
				array(
					'single'        => true,
					'type'          => 'boolean',
					'description'   => 'Whether the spoken article player trigger is enabled for this post.',
					'default'       => true,
					'show_in_rest'  => true,
					'auth_callback' => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);
		}
	}
}
