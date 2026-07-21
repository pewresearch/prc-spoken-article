<?php
declare(strict_types=1);
/**
 * ElevenLabs API key and model resolution.
 *
 * @package PRC\Platform\Spoken_Article
 */

namespace PRC\Platform\Spoken_Article;

class ElevenLabs_Settings {

	public const API_KEY_CONSTANT   = 'PRC_PLATFORM_ELEVENLABS_API_KEY';
	public const API_KEY_OPTION     = 'elevenlabs_api_key';
	public const MODEL_OPTION       = 'elevenlabs_model';
	public const DRAFT_MODEL_OPTION = 'elevenlabs_draft_model';
	public const DEFAULT_MODEL      = 'eleven_multilingual_v2';
	public const DEFAULT_DRAFT_MODEL = 'eleven_flash_v2_5';

	/**
	 * Allowed TTS model IDs.
	 *
	 * @var string[]
	 */
	private const ALLOWED_MODELS = array(
		'eleven_multilingual_v2',
		'eleven_flash_v2_5',
		'eleven_v3',
	);

	/**
	 * Deprecated models to migrate away from.
	 *
	 * @var string[]
	 */
	private const DEPRECATED_MODELS = array(
		'eleven_monolingual_v1',
		'eleven_multilingual_v1',
	);

	public static function is_api_key_via_constant(): bool {
		return defined( self::API_KEY_CONSTANT ) && '' !== (string) constant( self::API_KEY_CONSTANT );
	}

	public static function get_api_key(): string {
		if ( self::is_api_key_via_constant() ) {
			return (string) constant( self::API_KEY_CONSTANT );
		}

		return (string) get_option( self::API_KEY_OPTION, '' );
	}

	public static function is_connected(): bool {
		return '' !== self::get_api_key();
	}

	/**
	 * Sanitize a TTS model ID (production fallback). Safe as a meta sanitize_callback.
	 *
	 * @param string $model Candidate model ID.
	 */
	public static function sanitize_model( string $model ): string {
		return self::coerce_model( $model, self::DEFAULT_MODEL );
	}

	/**
	 * Sanitize a TTS model ID with an explicit fallback.
	 *
	 * @param string $model   Candidate model ID.
	 * @param string $default Fallback when invalid or deprecated.
	 */
	public static function coerce_model( string $model, string $default = self::DEFAULT_MODEL ): string {
		$model = sanitize_text_field( $model );

		if ( in_array( $model, self::DEPRECATED_MODELS, true ) ) {
			return $default;
		}

		if ( in_array( $model, self::ALLOWED_MODELS, true ) ) {
			return $model;
		}

		return $default;
	}

	public static function get_model(): string {
		return self::get_production_model();
	}

	public static function get_production_model(): string {
		$stored = get_option( self::MODEL_OPTION, self::DEFAULT_MODEL );
		if ( ! is_string( $stored ) ) {
			return self::DEFAULT_MODEL;
		}

		return self::coerce_model( $stored, self::DEFAULT_MODEL );
	}

	public static function get_draft_model(): string {
		$stored = get_option( self::DRAFT_MODEL_OPTION, self::DEFAULT_DRAFT_MODEL );
		if ( ! is_string( $stored ) ) {
			return self::DEFAULT_DRAFT_MODEL;
		}

		return self::coerce_model( $stored, self::DEFAULT_DRAFT_MODEL );
	}

	/**
	 * Resolve model ID for a draft or production audio quality tier.
	 *
	 * @param string $quality `draft` or `production`.
	 */
	public static function get_model_for_quality( string $quality = 'production' ): string {
		if ( 'draft' === $quality ) {
			return self::get_draft_model();
		}

		return self::get_production_model();
	}

	public static function maybe_migrate_model_option(): void {
		foreach ( array( self::MODEL_OPTION, self::DRAFT_MODEL_OPTION ) as $option_key ) {
			$default = self::MODEL_OPTION === $option_key ? self::DEFAULT_MODEL : self::DEFAULT_DRAFT_MODEL;
			$stored  = get_option( $option_key, $default );
			if ( ! is_string( $stored ) ) {
				continue;
			}

			$migrated = self::coerce_model( $stored, $default );
			if ( $migrated !== $stored ) {
				update_option( $option_key, $migrated );
			}
		}
	}

	/**
	 * Settings payload for the admin settings REST API and JS store.
	 *
	 * @return array<string, mixed>
	 */
	public static function get_admin_settings_payload(): array {
		self::maybe_migrate_model_option();

		$via_constant = self::is_api_key_via_constant();

		return array(
			'elevenlabs_model'       => self::get_production_model(),
			'elevenlabs_draft_model' => self::get_draft_model(),
			'elevenlabs_api_key'     => $via_constant ? '' : (string) get_option( self::API_KEY_OPTION, '' ),
			'elevenlabs_connected'   => self::is_connected(),
			'api_key_via_constant'   => $via_constant,
		);
	}

	/**
	 * Persist admin settings from REST POST body.
	 *
	 * @param array<string, mixed> $body Request body.
	 */
	public static function save_admin_settings( array $body ): void {
		if ( isset( $body['elevenlabs_model'] ) ) {
			update_option(
				self::MODEL_OPTION,
				self::coerce_model( (string) $body['elevenlabs_model'], self::DEFAULT_MODEL )
			);
		}

		if ( isset( $body['elevenlabs_draft_model'] ) ) {
			update_option(
				self::DRAFT_MODEL_OPTION,
				self::coerce_model(
					(string) $body['elevenlabs_draft_model'],
					self::DEFAULT_DRAFT_MODEL
				)
			);
		}

		if ( ! self::is_api_key_via_constant() && isset( $body['elevenlabs_api_key'] ) ) {
			$previous = (string) get_option( self::API_KEY_OPTION, '' );
			$next     = sanitize_text_field( (string) $body['elevenlabs_api_key'] );
			update_option( self::API_KEY_OPTION, $next );
			if ( $previous !== $next ) {
				Voice::bust_cache();
			}
		}
	}

	/**
	 * ElevenLabs config for wp_localize_script.
	 *
	 * @return array<string, mixed>
	 */
	public static function get_localize_config(): array {
		self::maybe_migrate_model_option();

		$production_model = self::get_production_model();

		return array(
			'connected'       => self::is_connected(),
			'voiceId'         => Voice::get_default_voice_id(),
			'model'           => $production_model,
			'productionModel' => $production_model,
			'draftModel'      => self::get_draft_model(),
			'stability'       => (float) get_option( 'elevenlabs_stability', 0.5 ),
			'similarityBoost' => (float) get_option( 'elevenlabs_similarity_boost', 0.75 ),
		);
	}

	/**
	 * Resolve model for a spoken-article post and quality tier.
	 *
	 * @param int|null $spoken_article_id Spoken article post ID.
	 * @param string   $quality           `draft` or `production`.
	 */
	public static function get_model_for_post( ?int $spoken_article_id = null, string $quality = 'production' ): string {
		unset( $spoken_article_id );

		return self::get_model_for_quality( $quality );
	}
}
