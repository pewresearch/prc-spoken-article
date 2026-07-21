<?php
declare(strict_types=1);
/**
 * ElevenLabs voice catalog, default voice, and cache.
 *
 * @package PRC\Platform\Spoken_Article
 */

namespace PRC\Platform\Spoken_Article;

/**
 * Domain logic for voices. REST routes are registered in Rest_API and delegate here.
 */
class Voice {

	public const OPTION_KEY       = 'elevenlabs_voice_id';
	public const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
	public const CACHE_VERSION_OPTION = 'spoken_article_voices_cache_version';
	public const CACHE_TTL        = DAY_IN_SECONDS;

	/**
	 * Default site voice ID.
	 */
	public static function get_default_voice_id(): string {
		$stored = get_option( self::OPTION_KEY, self::DEFAULT_VOICE_ID );
		if ( ! is_string( $stored ) || '' === $stored ) {
			return self::DEFAULT_VOICE_ID;
		}

		return $stored;
	}

	/**
	 * Persist the site default voice ID.
	 *
	 * @param string $voice_id ElevenLabs voice ID.
	 */
	public static function save_default_voice_id( string $voice_id ): string {
		$voice_id = sanitize_text_field( $voice_id );
		update_option( self::OPTION_KEY, $voice_id );
		return $voice_id;
	}

	/**
	 * Resolve voice for a spoken-article post, honoring per-article meta.
	 *
	 * @param int|null $spoken_article_id Spoken article post ID.
	 */
	public static function get_voice_id_for_post( ?int $spoken_article_id = null ): string {
		$voice_id = self::get_default_voice_id();

		if ( $spoken_article_id ) {
			$override = get_post_meta( $spoken_article_id, 'spoken_article_voice_id', true );
			if ( is_string( $override ) && '' !== $override ) {
				$voice_id = $override;
			}
		}

		return $voice_id;
	}

	/**
	 * Invalidate cached voice list/get responses.
	 */
	public static function bust_cache(): void {
		$version = (int) get_option( self::CACHE_VERSION_OPTION, 0 );
		update_option( self::CACHE_VERSION_OPTION, $version + 1, false );
	}

	/**
	 * List voices from ElevenLabs (cached 1 day).
	 *
	 * @param array<string, mixed> $query   Query args (search, page_size, etc.).
	 * @param bool                 $refresh Bypass cache when true (caller must authorize).
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function list_voices( array $query = array(), bool $refresh = false ) {
		$params = array(
			'page_size'           => isset( $query['page_size'] ) ? (string) absint( $query['page_size'] ) : '30',
			'sort'                => isset( $query['sort'] ) ? sanitize_text_field( (string) $query['sort'] ) : 'name',
			'sort_direction'      => isset( $query['sort_direction'] ) ? sanitize_text_field( (string) $query['sort_direction'] ) : 'asc',
			'include_total_count' => 'false',
		);

		if ( ! empty( $query['search'] ) ) {
			$params['search'] = sanitize_text_field( (string) $query['search'] );
		}

		$api_key = ElevenLabs_Settings::get_api_key();
		if ( '' === $api_key ) {
			return new \WP_Error(
				'elevenlabs_not_configured',
				__( 'ElevenLabs API key is not configured.', 'prc-spoken-article' ),
				array( 'status' => 503 )
			);
		}

		$cache_key = self::cache_key( 'list_' . md5( wp_json_encode( $params ) ) );

		if ( ! $refresh ) {
			$cached = get_transient( $cache_key );
			if ( is_array( $cached ) ) {
				return $cached;
			}
		}

		$url = add_query_arg( $params, 'https://api.elevenlabs.io/v2/voices' );

		$response = wp_remote_get(
			$url,
			array(
				'headers' => array(
					'xi-api-key' => $api_key,
					'Accept'     => 'application/json',
				),
				'timeout' => 30,
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = wp_remote_retrieve_body( $response );

		if ( 200 !== $code ) {
			return new \WP_Error(
				'elevenlabs_api_error',
				sprintf(
					/* translators: 1: HTTP status code, 2: response body */
					__( 'ElevenLabs API error: %1$d - %2$s', 'prc-spoken-article' ),
					$code,
					$body
				),
				array( 'status' => $code )
			);
		}

		$data = json_decode( $body, true );
		if ( ! is_array( $data ) ) {
			return new \WP_Error(
				'elevenlabs_invalid_response',
				__( 'Invalid response from ElevenLabs voices API.', 'prc-spoken-article' ),
				array( 'status' => 502 )
			);
		}

		set_transient( $cache_key, $data, self::CACHE_TTL );

		return $data;
	}

	/**
	 * Get a single voice by ID (cached 1 day).
	 *
	 * @param string $voice_id Voice ID.
	 * @param bool   $refresh  Bypass cache when true.
	 * @return array<string, mixed>|\WP_Error
	 */
	public static function get_voice( string $voice_id, bool $refresh = false ) {
		$voice_id = sanitize_text_field( $voice_id );
		if ( '' === $voice_id ) {
			return new \WP_Error(
				'invalid_voice_id',
				__( 'Voice ID is required.', 'prc-spoken-article' ),
				array( 'status' => 400 )
			);
		}

		$api_key = ElevenLabs_Settings::get_api_key();
		if ( '' === $api_key ) {
			return new \WP_Error(
				'elevenlabs_not_configured',
				__( 'ElevenLabs API key is not configured.', 'prc-spoken-article' ),
				array( 'status' => 503 )
			);
		}

		$cache_key = self::cache_key( 'voice_' . $voice_id );

		if ( ! $refresh ) {
			$cached = get_transient( $cache_key );
			if ( is_array( $cached ) ) {
				return $cached;
			}
		}

		$url = 'https://api.elevenlabs.io/v1/voices/' . rawurlencode( $voice_id );

		$response = wp_remote_get(
			$url,
			array(
				'headers' => array(
					'xi-api-key' => $api_key,
					'Accept'     => 'application/json',
				),
				'timeout' => 30,
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = wp_remote_retrieve_body( $response );

		if ( 200 !== $code ) {
			return new \WP_Error(
				'elevenlabs_api_error',
				sprintf(
					/* translators: 1: HTTP status code, 2: response body */
					__( 'ElevenLabs API error: %1$d - %2$s', 'prc-spoken-article' ),
					$code,
					$body
				),
				array( 'status' => $code )
			);
		}

		$data = json_decode( $body, true );
		if ( ! is_array( $data ) ) {
			return new \WP_Error(
				'elevenlabs_invalid_response',
				__( 'Invalid response from ElevenLabs voice API.', 'prc-spoken-article' ),
				array( 'status' => 502 )
			);
		}

		set_transient( $cache_key, $data, self::CACHE_TTL );

		return $data;
	}

	/**
	 * Build a versioned transient key.
	 *
	 * @param string $suffix Cache key suffix.
	 */
	private static function cache_key( string $suffix ): string {
		$version = (int) get_option( self::CACHE_VERSION_OPTION, 0 );
		return 'sa_el_v' . $version . '_' . $suffix;
	}
}
