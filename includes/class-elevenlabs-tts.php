<?php
declare(strict_types=1);
/**
 * Shared ElevenLabs REST TTS helper.
 *
 * @package PRC\Platform\Spoken_Article
 */

namespace PRC\Platform\Spoken_Article;

/**
 * Server-side text-to-speech via ElevenLabs REST API.
 */
class ElevenLabs_TTS {

	/**
	 * Synthesize speech and return raw MP3 bytes.
	 *
	 * @param string               $text            Text to speak.
	 * @param string               $voice_id        ElevenLabs voice ID.
	 * @param string               $model_id        Model ID.
	 * @param array<string, float> $voice_settings  Optional stability / similarity_boost.
	 * @return string|\WP_Error Audio bytes or error.
	 */
	public static function synthesize(
		string $text,
		string $voice_id,
		string $model_id,
		array $voice_settings = array()
	) {
		$api_key = ElevenLabs_Settings::get_api_key();
		if ( '' === $api_key ) {
			return new \WP_Error(
				'elevenlabs_not_configured',
				__( 'ElevenLabs API key is not configured.', 'prc-spoken-article' ),
				array( 'status' => 503 )
			);
		}

		$text = trim( $text );
		if ( strlen( $text ) < 10 ) {
			return new \WP_Error(
				'tts_text_too_short',
				__( 'Text is too short to generate audio.', 'prc-spoken-article' ),
				array( 'status' => 400 )
			);
		}

		$voice_id = sanitize_text_field( $voice_id );
		if ( '' === $voice_id ) {
			$voice_id = Voice::get_default_voice_id();
		}

		$model_id = ElevenLabs_Settings::coerce_model(
			$model_id,
			ElevenLabs_Settings::DEFAULT_MODEL
		);

		$stability = isset( $voice_settings['stability'] )
			? (float) $voice_settings['stability']
			: (float) get_option( 'elevenlabs_stability', 0.5 );
		$similarity = isset( $voice_settings['similarity_boost'] )
			? (float) $voice_settings['similarity_boost']
			: (float) get_option( 'elevenlabs_similarity_boost', 0.75 );

		$url = 'https://api.elevenlabs.io/v1/text-to-speech/' . rawurlencode( $voice_id );

		$body = wp_json_encode(
			array(
				'text'           => $text,
				'model_id'       => $model_id,
				'voice_settings' => array(
					'stability'        => $stability,
					'similarity_boost' => $similarity,
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

		$code         = wp_remote_retrieve_response_code( $response );
		$response_body = wp_remote_retrieve_body( $response );

		if ( 200 !== $code ) {
			return new \WP_Error(
				'elevenlabs_api_error',
				sprintf(
					/* translators: 1: HTTP status code, 2: response body */
					__( 'ElevenLabs API error: %1$d - %2$s', 'prc-spoken-article' ),
					$code,
					$response_body
				),
				array( 'status' => $code >= 400 && $code < 600 ? $code : 502 )
			);
		}

		if ( '' === $response_body ) {
			return new \WP_Error(
				'elevenlabs_empty_audio',
				__( 'ElevenLabs returned empty audio.', 'prc-spoken-article' ),
				array( 'status' => 502 )
			);
		}

		return $response_body;
	}
}
