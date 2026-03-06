<?php
/**
 * Player Block
 *
 * @package PRC\Platform\Blocks
 */

namespace PRC\Platform\Spoken_Article;

use WP_Block;

/**
 * Player Block class — renders the persistent dialog/audio player.
 * Intended for placement in the site footer template so it's always available.
 * Audio data is supplied by the trigger block via Interactivity API global state.
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
	 * Outputs the floating <dialog> player controlled via the Interactivity API.
	 * The player starts with empty defaults — audio data is injected by the
	 * trigger block's `actions.requestPlay` or restored from session storage.
	 *
	 * @param array    $attributes Block attributes.
	 * @param string   $content Block content.
	 * @param WP_Block $block Block instance.
	 * @return string Rendered block HTML.
	 */
	public function render_block_callback( $attributes, $content, $block ) {
		// @TODO: Right now this is in BETA mode, so we only want to show the block to logged in users.
		if ( ! is_user_logged_in() ) {
			return '';
		}

		if ( is_admin() ) {
			return '';
		}

		$block_wrapper_attrs = get_block_wrapper_attributes(
			array(
				'data-wp-interactive' => wp_json_encode( array( 'namespace' => 'prc-spoken-article/player' ) ),
				'data-wp-context'     => wp_json_encode(
					array(
						'audioUrl'          => '',
						'duration'          => '',
						'postTitle'         => '',
						'postUrl'           => '',
						'postId'            => 0,
						'playCountEndpoint' => '',
						'hasAudio'          => false,
						'isPlaying'         => false,
						'isPlayerOpen'      => false,
						'isExpanded'        => false,
						'currentTime'       => 0,
						'totalDuration'     => 0,
						'playbackRate'      => 1,
						'hasTrackedPlay'    => false,
					)
				),
				'data-wp-watch'       => 'callbacks.onPendingAudio',
			)
		);

		ob_start();
		?>
		<div <?php echo $block_wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> data-wp-init="callbacks.onInit">
			<dialog
				class="spoken-article-dialog"
				data-wp-ref="playerDialog"
				data-wp-on--close="actions.onDialogClose"
			>
				<div class="spoken-article-player" data-wp-class--is-expanded="context.isExpanded">
					<div class="spoken-article-player__header">
						<button
							class="spoken-article-player__resume-btn"
							data-wp-bind--hidden="!state.showIOSResumePrompt"
							data-wp-on--click="actions.togglePlay"
							aria-label="<?php esc_attr_e( 'Resume playback', 'prc-spoken-article' ); ?>"
						>
							<?php echo \PRC\Platform\Icons\render( 'solid', 'play' ); ?>
							<?php esc_html_e( 'Resume', 'prc-spoken-article' ); ?>
						</button>
						<div class="spoken-article-player__header-row">
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

						<a
							class="spoken-article-player__back-link"
							href="#"
							data-wp-bind--href="context.postUrl"
							data-wp-bind--hidden="!context.postUrl"
						>
							<?php esc_html_e( "Go to article you're listening to", 'prc-spoken-article' ); ?>
						</a>
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
