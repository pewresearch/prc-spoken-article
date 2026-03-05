<?php
/**
 * Player Block
 *
 * @package PRC\Platform\Blocks
 */

namespace PRC\Platform\Spoken_Article;

use PRC\Platform\Spoken_Article\Post_Meta;
use PRC\Platform\Spoken_Article\Rest_API;
use WP_Block;

/**
 * Player Block class — block registration and render only.
 */
class Player_Block {

	/**
	 * Block name
	 *
	 * @var string
	 */
	public static $block_name = 'prc-spoken-article/player';

	/**
	 * Loader instance
	 *
	 * @var \PRC\Platform\Spoken_Article\Loader
	 */
	protected $loader;

	/**
	 * Constructor
	 *
	 * @param \PRC\Platform\Spoken_Article\Loader $loader The loader instance.
	 */
	public function __construct( $loader ) {
		$this->loader = $loader;
		$this->loader->add_action( 'init', $this, 'register_block' );
	}

	/**
	 * Register the block.
	 *
	 * @hook init
	 */
	public function register_block() {
		register_block_type_from_metadata(
			PRC_SPOKEN_ARTICLE_BLOCKS_DIR . '/player-block',
			array(
				'render_callback' => array( $this, 'render_block_callback' ),
			)
		);
	}

	/**
	 * Render callback for the block.
	 *
	 * Reads audio data from post meta. Outputs an inline trigger and a
	 * floating <dialog> player controlled via the Interactivity API.
	 *
	 * @param array    $attributes Block attributes.
	 * @param string   $content Block content.
	 * @param WP_Block $block Block instance.
	 * @return string Rendered block HTML.
	 */
	public function render_block_callback( $attributes, $content, $block ) {
		if ( is_admin() ) {
			return '';
		}

		$post_id = $block->context['postId'] ?? get_the_ID();
		if ( ! $post_id ) {
			return '';
		}

		$spoken = get_post_meta( $post_id, Post_Meta::META_KEY, true );
		if ( empty( $spoken ) || empty( $spoken['attachment_id'] ) || empty( $spoken['audio_url'] ) ) {
			return '';
		}

		$audio_url  = $spoken['audio_url'];
		$duration   = $spoken['duration'] ?? '';
		$post_title = get_the_title( $post_id );

		$block_wrapper_attrs = get_block_wrapper_attributes(
			array(
				'data-wp-interactive' => wp_json_encode( array( 'namespace' => 'prc-spoken-article/player' ) ),
				'data-wp-context'     => wp_json_encode(
					array(
						'audioUrl'          => esc_url( $audio_url ),
						'duration'          => esc_attr( $duration ),
						'postTitle'         => esc_attr( $post_title ),
						'postId'            => $post_id,
						'playCountEndpoint' => esc_url( rest_url( Rest_API::NAMESPACE . '/play-count/' . $post_id ) ),
						'isPlaying'         => false,
						'isPlayerOpen'      => false,
						'isExpanded'        => false,
						'currentTime'       => 0,
						'totalDuration'     => 0,
						'playbackRate'      => 1,
						'hasTrackedPlay'    => false,
					)
				),
			)
		);

		ob_start();
		?>
		<div <?php echo $block_wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> data-wp-init="callbacks.onInit">
			<button
				class="spoken-article-trigger"
				data-wp-on--click="actions.openPlayer"
				aria-label="<?php esc_attr_e( 'Listen to this article', 'prc-spoken-article' ); ?>"
			>
				<?php echo \PRC\Platform\Icons\render( 'solid', 'headphones' ); ?>
				<span class="spoken-article-trigger__duration">
					<?php echo esc_html( $duration ); ?>
				</span>
			</button>

			<dialog
				class="spoken-article-dialog"
				data-wp-ref="playerDialog"
				data-wp-on--close="actions.onDialogClose"
			>
				<div class="spoken-article-player" data-wp-class--is-expanded="context.isExpanded">
					<div class="spoken-article-player__header">
						<div class="spoken-article-player__title-row">
							<span class="spoken-article-player__title" data-wp-text="context.postTitle"></span>
							<span class="spoken-article-player__duration-badge" data-wp-text="context.duration"></span>
						</div>
						<div class="spoken-article-player__controls-mini">
							<button
								class="spoken-article-player__play-btn"
								data-wp-on--click="actions.togglePlay"
								aria-label="<?php esc_attr_e( 'Play or pause', 'prc-spoken-article' ); ?>"
							>
								<span data-wp-bind--hidden="context.isPlaying">
									<?php echo \PRC\Platform\Icons\render( 'solid', 'play' ); ?>
								</span>
								<span data-wp-bind--hidden="!context.isPlaying">
									<?php echo \PRC\Platform\Icons\render( 'solid', 'pause' ); ?>
								</span>
							</button>
							<button
								class="spoken-article-player__expand-btn"
								data-wp-on--click="actions.toggleExpand"
								data-wp-bind--hidden="context.isExpanded"
								aria-label="<?php esc_attr_e( 'Expand player', 'prc-spoken-article' ); ?>"
							>
								<?php echo \PRC\Platform\Icons\render( 'solid', 'angle-up' ); ?>
							</button>
							<button
								class="spoken-article-player__close-btn"
								data-wp-on--click="actions.closePlayer"
								aria-label="<?php esc_attr_e( 'Close player', 'prc-spoken-article' ); ?>"
							>
								<?php echo \PRC\Platform\Icons\render( 'solid', 'xmark' ); ?>
							</button>
						</div>
					</div>

					<div class="spoken-article-player__expanded" data-wp-bind--hidden="!context.isExpanded">
						<div class="spoken-article-player__progress">
							<input
								class="spoken-article-player__seek"
								type="range"
								min="0"
								max="100"
								value="0"
								step="0.1"
								data-wp-on--input="actions.seek"
								data-wp-bind--value="state.progressPercent"
								aria-label="<?php esc_attr_e( 'Seek', 'prc-spoken-article' ); ?>"
							>
							<div class="spoken-article-player__time">
								<span data-wp-text="state.elapsedFormatted"></span>
								<span data-wp-text="state.remainingFormatted"></span>
							</div>
						</div>

						<div class="spoken-article-player__controls-full">
							<button
								class="spoken-article-player__skip-btn"
								data-wp-on--click="actions.skipBack"
								aria-label="<?php esc_attr_e( 'Skip back 15 seconds', 'prc-spoken-article' ); ?>"
							>
								<?php echo \PRC\Platform\Icons\render( 'solid', 'backward' ); ?>
								<span class="spoken-article-player__skip-label">15</span>
							</button>
							<button
								class="spoken-article-player__play-btn spoken-article-player__play-btn--large"
								data-wp-on--click="actions.togglePlay"
								aria-label="<?php esc_attr_e( 'Play or pause', 'prc-spoken-article' ); ?>"
							>
								<span data-wp-bind--hidden="context.isPlaying">
									<?php echo \PRC\Platform\Icons\render( 'solid', 'play' ); ?>
								</span>
								<span data-wp-bind--hidden="!context.isPlaying">
									<?php echo \PRC\Platform\Icons\render( 'solid', 'pause' ); ?>
								</span>
							</button>
							<button
								class="spoken-article-player__skip-btn"
								data-wp-on--click="actions.skipForward"
								aria-label="<?php esc_attr_e( 'Skip forward 15 seconds', 'prc-spoken-article' ); ?>"
							>
								<?php echo \PRC\Platform\Icons\render( 'solid', 'forward' ); ?>
								<span class="spoken-article-player__skip-label">15</span>
							</button>
						</div>

						<div class="spoken-article-player__speed">
							<span class="spoken-article-player__speed-label"><?php esc_html_e( 'Speed', 'prc-spoken-article' ); ?></span>
							<button class="spoken-article-player__speed-btn" data-wp-on--click="actions.decreaseSpeed" aria-label="<?php esc_attr_e( 'Decrease speed', 'prc-spoken-article' ); ?>">−</button>
							<span class="spoken-article-player__speed-value" data-wp-text="state.speedLabel"></span>
							<button class="spoken-article-player__speed-btn" data-wp-on--click="actions.increaseSpeed" aria-label="<?php esc_attr_e( 'Increase speed', 'prc-spoken-article' ); ?>">+</button>
						</div>

						<button
							class="spoken-article-player__collapse-btn"
							data-wp-on--click="actions.toggleExpand"
							aria-label="<?php esc_attr_e( 'Collapse player', 'prc-spoken-article' ); ?>"
						>
							<?php echo \PRC\Platform\Icons\render( 'solid', 'minus' ); ?>
						</button>

						<p class="spoken-article-player__disclaimer">
							<?php esc_html_e( 'Voice is AI-generated. Inconsistencies may occur.', 'prc-spoken-article' ); ?>
						</p>
					</div>
				</div>

				<audio
					data-wp-ref="audioElement"
					data-wp-on--timeupdate="actions.updateTime"
					data-wp-on--ended="actions.onEnded"
					data-wp-on--loadedmetadata="actions.onLoadedMetadata"
					preload="metadata"
				>
					<source data-wp-bind--src="context.audioUrl" type="audio/mpeg">
				</audio>
			</dialog>
		</div>
		<?php
		return ob_get_clean();
	}
}
