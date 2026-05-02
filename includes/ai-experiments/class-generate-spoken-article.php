<?php
/**
 * Generate Spoken Article Ability.
 *
 * Generates AI-narrated audio from post text content using ElevenLabs REST API.
 * Creates or updates the spoken-article CPT for the target post.
 *
 * @package PRC\Platform\Spoken_Article\AI_Experiments
 */

namespace PRC\Platform\Spoken_Article\AI_Experiments;

use PRC\Platform\Spoken_Article\Content_Type;
use PRC\Platform\Spoken_Article\Post_Meta;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Generate Spoken Article ability class.
 */
class Generate_Spoken_Article {

	/**
	 * Ability name.
	 *
	 * @var string
	 */
	public static $ability_name = 'prc-spoken-article/generate';

	/**
	 * Blocks that are allowed to use this ability.
	 *
	 * @var array
	 */
	public static $allowed_blocks = array( 'prc-spoken-article/player' );

	/**
	 * Register the generate-spoken-article ability with WP Abilities API.
	 *
	 * @hook wp_abilities_api_init
	 */
	public function register_ability() {
		wp_register_ability(
			self::$ability_name,
			array(
				'label'               => __( 'Generate Spoken Article', 'prc-spoken-article' ),
				'description'         => __( 'Generate AI-narrated audio from post content using ElevenLabs.', 'prc-spoken-article' ),
				'category'            => 'media-generation',
				'input_schema'        => array(
					'type'                 => 'object',
					'properties'           => array(
						'post_id' => array(
							'type'        => 'number',
							'description' => 'The post ID to generate audio for.',
						),
					),
					'required'             => array( 'post_id' ),
					'additionalProperties' => false,
				),
				'output_schema'       => array(
					'type'       => 'object',
					'properties' => array(
						'error'     => array(
							'type'        => 'string',
							'description' => 'An error message, if any.',
						),
						'audio_id'  => array(
							'type'        => 'number',
							'description' => 'The media library attachment ID.',
						),
						'audio_url' => array(
							'type'        => 'string',
							'description' => 'The audio file URL.',
						),
						'duration'  => array(
							'type'        => 'string',
							'description' => 'Human-readable duration (e.g., "2:30").',
						),
					),
				),
				'execute_callback'    => array( $this, 'execute' ),
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
				'meta'                => array(
					'annotations'    => array(
						'instructions' => 'This ability extracts text from a WordPress post and generates AI-narrated audio using ElevenLabs API.',
						'readonly'     => false,
						'destructive'  => false,
						'idempotent'   => false,
					),
					'show_in_rest'   => true,
					'allowed_blocks' => self::$allowed_blocks,
				),
			)
		);
	}

	/**
	 * Get ElevenLabs settings from constants and options.
	 *
	 * @return array Settings with api_key, voice_id, model, stability, and similarity_boost.
	 */
	private function get_elevenlabs_settings() {
		return array(
			'api_key'          => defined( 'PRC_PLATFORM_ELEVENLABS_API_KEY' ) ? PRC_PLATFORM_ELEVENLABS_API_KEY : '',
			'voice_id'         => get_option( 'elevenlabs_voice_id', 'EXAVITQu4vr4xnSDxMaL' ),
			'model'            => get_option( 'elevenlabs_model', 'eleven_monolingual_v1' ),
			'stability'        => (float) get_option( 'elevenlabs_stability', 0.5 ),
			'similarity_boost' => (float) get_option( 'elevenlabs_similarity_boost', 0.75 ),
		);
	}

	/**
	 * Extract text content from post HTML.
	 *
	 * @param string $html The HTML content.
	 * @return string The extracted plain text.
	 */
	private function extract_text_from_html( $html ) {
		$text = wp_strip_all_tags( $html );
		$text = preg_replace( '/\s+/', ' ', $text );
		$text = trim( $text );

		return $text;
	}

	/**
	 * Generate audio using ElevenLabs REST API.
	 *
	 * @param string $text The text to convert to speech.
	 * @param array  $settings ElevenLabs settings.
	 * @return array|WP_Error Audio data or error.
	 */
	private function generate_audio_with_elevenlabs( $text, $settings ) {
		$api_key  = $settings['api_key'];
		$voice_id = $settings['voice_id'];
		$url      = "https://api.elevenlabs.io/v1/text-to-speech/{$voice_id}";

		$body = wp_json_encode(
			array(
				'text'           => $text,
				'model_id'       => $settings['model'],
				'voice_settings' => array(
					'stability'        => $settings['stability'],
					'similarity_boost' => $settings['similarity_boost'],
				),
			)
		);

		$response = wp_remote_post(
			$url,
			array(
				'headers' => array(
					'Accept'       => 'audio/mpeg',
					'Content-Type' => 'application/json',
					'xi-api-key'   => $api_key,
				),
				'body'    => $body,
				'timeout' => 60,
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$response_code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== $response_code ) {
			$error_body = wp_remote_retrieve_body( $response );
			return new \WP_Error(
				'elevenlabs_api_error',
				sprintf(
					'ElevenLabs API error: %d - %s',
					$response_code,
					$error_body
				)
			);
		}

		return wp_remote_retrieve_body( $response );
	}

	/**
	 * Upload audio to WordPress media library.
	 *
	 * @param string $audio_data The audio file data.
	 * @param int    $post_id    The spoken-article CPT post ID.
	 * @return array|WP_Error Array with id, url, duration or WP_Error.
	 */
	private function upload_audio_to_media_library( $audio_data, $post_id ) {
		$upload_dir = wp_upload_dir();
		$filename   = 'spoken-article-' . $post_id . '-' . time() . '.mp3';
		$file_path  = $upload_dir['path'] . '/' . $filename;

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		$result = file_put_contents( $file_path, $audio_data );

		if ( false === $result ) {
			return new \WP_Error(
				'file_write_error',
				__( 'Failed to write audio file to uploads directory.', 'prc-spoken-article' )
			);
		}

		$file_type  = wp_check_filetype( $filename, null );
		$attachment = array(
			'guid'           => $upload_dir['url'] . '/' . $filename,
			'post_mime_type' => $file_type['type'],
			'post_title'     => sanitize_file_name( $filename ),
			'post_content'   => '',
			'post_status'    => 'inherit',
			'post_parent'    => $post_id,
		);

		$attachment_id = wp_insert_attachment( $attachment, $file_path, $post_id );

		if ( is_wp_error( $attachment_id ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.unlink_unlink
			unlink( $file_path );
			return $attachment_id;
		}

		require_once ABSPATH . 'wp-admin/includes/image.php';
		$attachment_data = wp_generate_attachment_metadata( $attachment_id, $file_path );
		wp_update_attachment_metadata( $attachment_id, $attachment_data );

		$duration = 'Unknown';
		if ( isset( $attachment_data['length_formatted'] ) ) {
			$duration = $attachment_data['length_formatted'];
		} elseif ( isset( $attachment_data['length'] ) ) {
			$seconds           = (int) $attachment_data['length'];
			$minutes           = floor( $seconds / 60 );
			$remaining_seconds = $seconds % 60;
			$duration          = sprintf( '%d:%02d', $minutes, $remaining_seconds );
		}

		return array(
			'id'       => $attachment_id,
			'url'      => wp_get_attachment_url( $attachment_id ),
			'duration' => $duration,
		);
	}

	/**
	 * Execute the ability: generate spoken article audio.
	 *
	 * Creates or finds the spoken-article CPT, generates audio, and writes meta to it.
	 *
	 * @param array $input The input with post_id.
	 * @return array Result with audio_id, audio_url, duration, and error.
	 */
	public function execute( $input ) {
		$post_id = $input['post_id'] ?? 0;

		if ( ! $post_id ) {
			return array(
				'error'     => __( 'Post ID is required.', 'prc-spoken-article' ),
				'audio_id'  => 0,
				'audio_url' => '',
				'duration'  => '',
			);
		}

		$post = get_post( $post_id );
		if ( ! $post ) {
			return array(
				'error'     => __( 'Post not found.', 'prc-spoken-article' ),
				'audio_id'  => 0,
				'audio_url' => '',
				'duration'  => '',
			);
		}

		$content_post = $post;
		if ( Content_Type::POST_TYPE === $post->post_type && $post->post_parent > 0 ) {
			$content_post = get_post( $post->post_parent );
		}

		if ( ! $content_post ) {
			return array(
				'error'     => __( 'Content post not found.', 'prc-spoken-article' ),
				'audio_id'  => 0,
				'audio_url' => '',
				'duration'  => '',
			);
		}

		$content = apply_filters( 'the_content', $content_post->post_content );

		if ( empty( $content ) ) {
			return array(
				'error'     => __( 'Post content is empty.', 'prc-spoken-article' ),
				'audio_id'  => 0,
				'audio_url' => '',
				'duration'  => '',
			);
		}

		$text = $this->extract_text_from_html( $content );

		if ( strlen( $text ) < 10 ) {
			return array(
				'error'     => __( 'Not enough text content to generate audio.', 'prc-spoken-article' ),
				'audio_id'  => 0,
				'audio_url' => '',
				'duration'  => '',
			);
		}

		$settings = $this->get_elevenlabs_settings();

		if ( empty( $settings['api_key'] ) ) {
			return array(
				'error'     => __( 'ElevenLabs API key is not configured.', 'prc-spoken-article' ),
				'audio_id'  => 0,
				'audio_url' => '',
				'duration'  => '',
			);
		}

		$spoken_article_id = null;
		if ( Content_Type::POST_TYPE === $post->post_type ) {
			$spoken_article_id = $post->ID;
		} else {
			$spoken_article = Content_Type::get_spoken_article_for_post( $content_post->ID );
			if ( $spoken_article ) {
				$spoken_article_id = $spoken_article->ID;
			} else {
				$result = Content_Type::create_spoken_article_for_post( $content_post->ID );
				if ( is_wp_error( $result ) ) {
					return array(
						'error'     => $result->get_error_message(),
						'audio_id'  => 0,
						'audio_url' => '',
						'duration'  => '',
					);
				}
				$spoken_article_id = $result;
			}
		}

		$audio_data = $this->generate_audio_with_elevenlabs( $text, $settings );

		if ( is_wp_error( $audio_data ) ) {
			return array(
				'error'     => $audio_data->get_error_message(),
				'audio_id'  => 0,
				'audio_url' => '',
				'duration'  => '',
			);
		}

		$upload_result = $this->upload_audio_to_media_library( $audio_data, $spoken_article_id );

		if ( is_wp_error( $upload_result ) ) {
			return array(
				'error'     => $upload_result->get_error_message(),
				'audio_id'  => 0,
				'audio_url' => '',
				'duration'  => '',
			);
		}

		update_post_meta(
			$spoken_article_id,
			Post_Meta::META_KEY,
			array(
				'attachment_id' => $upload_result['id'],
				'audio_url'     => $upload_result['url'],
				'duration'      => $upload_result['duration'],
			)
		);

		wp_update_post(
			array(
				'ID'           => $spoken_article_id,
				'post_content' => $text,
			)
		);

		return array(
			'error'     => '',
			'audio_id'  => $upload_result['id'],
			'audio_url' => $upload_result['url'],
			'duration'  => $upload_result['duration'],
		);
	}
}
