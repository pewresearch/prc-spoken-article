<?php
declare(strict_types=1);
/**
 * Interstitial Ads management.
 *
 * @package PRC\Platform\Spoken_Article
 */

namespace PRC\Platform\Spoken_Article;

class Interstitial_Ads {

	const ADS_OPTION_KEY   = 'spoken_article_interstitial_ads';
	const LABEL_OPTION_KEY = 'spoken_article_interstitial_label';
	const DEFAULT_LABEL    = 'A message from Pew Research Center';
	const ADMIN_PAGE_SLUG  = 'spoken-article-interstitials';

	public function __construct( Loader $loader ) {
		$loader->add_action( 'rest_api_init', $this, 'register_routes' );
		$loader->add_action( 'admin_menu', $this, 'register_admin_page' );
		$loader->add_action( 'admin_enqueue_scripts', $this, 'enqueue_admin_assets' );
	}

	public function register_routes(): void {
		register_rest_route(
			Rest_API::NAMESPACE,
			'/interstitial-ads',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_ads' ),
					'permission_callback' => function () {
						return current_user_can( 'manage_options' );
					},
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'save_ads' ),
					'permission_callback' => function () {
						return current_user_can( 'manage_options' );
					},
				),
			)
		);

		register_rest_route(
			Rest_API::NAMESPACE,
			'/interstitial-for-post/(?P<post_id>\d+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_interstitial_for_post_endpoint' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'post_id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
	}

	public function get_ads(): \WP_REST_Response {
		$ads   = get_option( self::ADS_OPTION_KEY, array() );
		$label = get_option( self::LABEL_OPTION_KEY, self::DEFAULT_LABEL );

		return rest_ensure_response(
			array(
				'ads'   => $ads,
				'label' => $label,
			)
		);
	}

	public function save_ads( \WP_REST_Request $request ): \WP_REST_Response {
		$body = $request->get_json_params();
		$ads  = $body['ads'] ?? array();
		if ( ! is_array( $ads ) ) {
			$ads = array();
		}
		$ads   = array_filter( $ads, 'is_array' );
		$label = sanitize_text_field( $body['label'] ?? self::DEFAULT_LABEL );

		$sanitized_ads = array_map(
			function ( $ad ) {
				return array(
					'id'           => sanitize_text_field( $ad['id'] ?? wp_generate_uuid4() ),
					'label'        => sanitize_text_field( $ad['label'] ?? '' ),
					'text'         => sanitize_textarea_field( $ad['text'] ?? '' ),
					'textIsDraft'  => (bool) ( $ad['textIsDraft'] ?? false ),
					'audioUrl'     => esc_url_raw( $ad['audioUrl'] ?? '' ),
					'attachmentId' => absint( $ad['attachmentId'] ?? 0 ),
					'duration'     => sanitize_text_field( $ad['duration'] ?? '' ),
					'voiceId'      => sanitize_text_field( $ad['voiceId'] ?? '' ),
					'weight'       => max( 1, min( 10, absint( $ad['weight'] ?? 5 ) ) ),
					'isActive'     => (bool) ( $ad['isActive'] ?? false ),
				);
			},
			$ads
		);

		update_option( self::ADS_OPTION_KEY, $sanitized_ads );
		update_option( self::LABEL_OPTION_KEY, $label );

		return rest_ensure_response(
			array(
				'ads'   => $sanitized_ads,
				'label' => $label,
			)
		);
	}

	public function get_interstitial_for_post_endpoint( \WP_REST_Request $request ): \WP_REST_Response {
		$post_id = (int) $request->get_param( 'post_id' );
		$result  = self::get_interstitial_for_post( $post_id );

		if ( null === $result ) {
			return rest_ensure_response( array( 'interstitial' => null ) );
		}

		return rest_ensure_response( array( 'interstitial' => $result ) );
	}

	/**
	 * Resolve which interstitial to play for a given post.
	 *
	 * Priority: per-article override > weighted random from active global ads > null.
	 *
	 * @param int $post_id The post ID.
	 * @return array{audioUrl: string, duration: string}|null
	 */
	public static function get_interstitial_for_post( int $post_id ): ?array {
		$spoken_article = Content_Type::get_spoken_article_for_post( $post_id );
		if ( $spoken_article ) {
			$enabled = (bool) get_post_meta( $spoken_article->ID, Post_Meta::INTERSTITIAL_ENABLED_META_KEY, true );
			if ( $enabled ) {
				$override = get_post_meta( $spoken_article->ID, Post_Meta::INTERSTITIAL_META_KEY, true );
				if ( ! empty( $override['audioUrl'] ) ) {
					return array(
						'audioUrl' => $override['audioUrl'],
						'duration' => $override['duration'] ?? '',
					);
				}
			}
		}

		$active_ads = self::get_active_global_ads();
		if ( empty( $active_ads ) ) {
			return null;
		}

		return self::select_weighted_random( $active_ads );
	}

	public static function get_active_global_ads(): array {
		$ads = get_option( self::ADS_OPTION_KEY, array() );
		return array_values(
			array_filter(
				$ads,
				function ( $ad ) {
					return ! empty( $ad['isActive'] ) && ! empty( $ad['audioUrl'] );
				}
			)
		);
	}

	/**
	 * Weighted random selection from a list of ads.
	 *
	 * @param array $ads Non-empty array of active ads with 'weight' keys.
	 * @return array{audioUrl: string, duration: string}
	 */
	public static function select_weighted_random( array $ads ): array {
		$total_weight = array_sum( array_column( $ads, 'weight' ) );
		if ( $total_weight <= 0 ) {
			$first = reset( $ads );
			return array(
				'audioUrl' => $first['audioUrl'] ?? '',
				'duration' => $first['duration'] ?? '',
			);
		}
		$rand       = wp_rand( 1, $total_weight );
		$cumulative = 0;

		foreach ( $ads as $ad ) {
			$cumulative += (int) $ad['weight'];
			if ( $rand <= $cumulative ) {
				return array(
					'audioUrl' => $ad['audioUrl'],
					'duration' => $ad['duration'] ?? '',
				);
			}
		}

		$last = end( $ads );
		return array(
			'audioUrl' => $last['audioUrl'],
			'duration' => $last['duration'] ?? '',
		);
	}

	public function register_admin_page(): void {
		add_submenu_page(
			'edit.php?post_type=spoken-article',
			__( 'Spoken Article Interstitials', 'prc-spoken-article' ),
			__( 'Interstitial Ads', 'prc-spoken-article' ),
			'manage_options',
			self::ADMIN_PAGE_SLUG,
			array( $this, 'render_admin_page' )
		);
	}

	public function render_admin_page(): void {
		echo '<div class="wrap"><div id="prc-spoken-article-interstitial-admin"></div></div>';
	}

	public function enqueue_admin_assets( string $hook_suffix ): void {
		if ( Content_Type::POST_TYPE . '_page_' . self::ADMIN_PAGE_SLUG !== $hook_suffix ) {
			return;
		}

		$asset_file = PRC_SPOKEN_ARTICLE_DIR . '/build/interstitial-admin/index.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}
		$asset  = require $asset_file;
		$handle = 'prc-spoken-article-interstitial-admin';

		wp_enqueue_media();

		wp_enqueue_script(
			$handle,
			plugins_url( 'build/interstitial-admin/index.js', PRC_SPOKEN_ARTICLE_FILE ),
			$asset['dependencies'],
			$asset['version'],
			true
		);

		if ( file_exists( PRC_SPOKEN_ARTICLE_DIR . '/build/interstitial-admin/style-index.css' ) ) {
			$style_deps = array( 'wp-components' );
			if ( in_array( 'prc-components', $asset['dependencies'], true ) ) {
				$style_deps[] = 'prc-components';
			}

			wp_enqueue_style(
				$handle,
				plugins_url( 'build/interstitial-admin/style-index.css', PRC_SPOKEN_ARTICLE_FILE ),
				$style_deps,
				$asset['version']
			);
		}

		wp_localize_script(
			$handle,
			'PRCSpokenArticleConfig',
			array(
				'restBase'  => rest_url( Rest_API::NAMESPACE ),
				'restNonce' => wp_create_nonce( 'wp_rest' ),
			)
		);

		wp_localize_script(
			$handle,
			'PRCSpokenArticleAI',
			array(
				'enabled'    => true,
				'elevenlabs' => array(
					'apiKey'          => defined( 'PRC_PLATFORM_ELEVENLABS_API_KEY' ) ? PRC_PLATFORM_ELEVENLABS_API_KEY : '',
					'voiceId'         => get_option( 'elevenlabs_voice_id', 'EXAVITQu4vr4xnSDxMaL' ),
					'model'           => get_option( 'elevenlabs_model', 'eleven_monolingual_v1' ),
					'stability'       => (float) get_option( 'elevenlabs_stability', 0.5 ),
					'similarityBoost' => (float) get_option( 'elevenlabs_similarity_boost', 0.75 ),
				),
				'restBase'   => rest_url( Rest_API::NAMESPACE ),
				'mediaUrl'   => rest_url( 'wp/v2/media' ),
				'restNonce'  => wp_create_nonce( 'wp_rest' ),
			)
		);
	}

	/**
	 * Get the interstitial label for player display.
	 */
	public static function get_label(): string {
		return get_option( self::LABEL_OPTION_KEY, self::DEFAULT_LABEL );
	}
}
