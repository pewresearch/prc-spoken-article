<?php
/**
 * Podcast RSS feed for spoken articles.
 *
 * @package PRC\Platform\Spoken_Article
 */

declare( strict_types=1 );

namespace PRC\Platform\Spoken_Article;

use WP_Post;
use WP_Query;

/**
 * Registers and renders a podcast-compatible RSS 2.0 feed for posts with spoken audio.
 */
class Podcast_Feed {

	/**
	 * Feed slug for the rewrite rule.
	 *
	 * @var string
	 */
	const FEED_SLUG = 'spoken-articles';

	/**
	 * Constructor.
	 *
	 * @param Loader $loader The loader instance.
	 */
	public function __construct( Loader $loader ) {
		$loader->add_action( 'init', $this, 'register_feed' );
	}

	/**
	 * Register the custom feed.
	 *
	 * @hook init
	 */
	public function register_feed(): void {
		add_feed( self::FEED_SLUG, array( $this, 'render_feed' ) );
	}

	/**
	 * Render the RSS feed.
	 */
	public function render_feed(): void {
		$query_args = apply_filters(
			'prc_spoken_article_podcast_query_args',
			array(
				'post_type'      => Bootstrap::get_enabled_post_types(),
				'post_status'    => 'publish',
				'posts_per_page' => 50,
				'orderby'        => 'date',
				'order'          => 'DESC',
				'meta_query'     => array(
					array(
						'key'     => Post_Meta::META_KEY,
						'compare' => 'EXISTS',
					),
				),
			)
		);

		$query = new WP_Query( $query_args );
		$posts = array();

		foreach ( $query->posts as $post ) {
			$spoken = get_post_meta( $post->ID, Post_Meta::META_KEY, true );
			if ( ! empty( $spoken['audio_url'] ) ) {
				$posts[] = $post;
			}
		}

		$channel = apply_filters(
			'prc_spoken_article_podcast_channel',
			array(
				'title'       => get_bloginfo( 'name' ) . ' - ' . __( 'Spoken Articles', 'prc-spoken-article' ),
				'link'        => get_bloginfo( 'url' ),
				'description' => get_bloginfo( 'description' ),
				'language'    => get_bloginfo( 'language' ),
				'author'      => __( 'Pew Research Center', 'prc-spoken-article' ),
				'image'       => get_site_icon_url( 1400 ) ?: '',
				'category'    => 'News',
				'subcategory' => 'Politics',
				'explicit'    => 'no',
				'type'        => 'episodic',
				'copyright'   => '© ' . gmdate( 'Y' ) . ' ' . __( 'Pew Research Center', 'prc-spoken-article' ),
			)
		);

		$feed_url = get_feed_link( self::FEED_SLUG );
		$last_mod = ! empty( $posts ) ? get_post_modified_time( 'D, d M Y H:i:s +0000', true, $posts[0] ) : gmdate( 'D, d M Y H:i:s +0000' );

		header( 'Content-Type: application/rss+xml; charset=' . get_option( 'blog_charset' ), true );
		header( 'Cache-Control: public, max-age=3600', true );
		header( 'Last-Modified: ' . $last_mod, true );
		header( 'X-Robots-Tag: noindex, follow', true );

		echo '<?xml version="1.0" encoding="' . esc_attr( get_option( 'blog_charset' ) ) . '"?>' . "\n";
		?>
<rss version="2.0"
	xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
	xmlns:atom="http://www.w3.org/2005/Atom"
	xmlns:content="http://purl.org/rss/1.0/modules/content/">
	<channel>
		<title><?php echo esc_html( $channel['title'] ); ?></title>
		<link><?php echo esc_url( $channel['link'] ); ?></link>
		<description><?php echo esc_html( $channel['description'] ); ?></description>
		<language><?php echo esc_html( $channel['language'] ); ?></language>
		<copyright><?php echo esc_html( $channel['copyright'] ); ?></copyright>
		<lastBuildDate><?php echo esc_html( gmdate( 'D, d M Y H:i:s +0000' ) ); ?></lastBuildDate>
		<atom:link href="<?php echo esc_url( $feed_url ); ?>" rel="self" type="application/rss+xml"/>
		<?php if ( ! empty( $channel['image'] ) ) : ?>
		<itunes:image href="<?php echo esc_url( $channel['image'] ); ?>"/>
		<?php endif; ?>
		<itunes:author><?php echo esc_html( $channel['author'] ); ?></itunes:author>
		<itunes:explicit><?php echo esc_html( $channel['explicit'] ); ?></itunes:explicit>
		<itunes:type><?php echo esc_html( $channel['type'] ); ?></itunes:type>
		<itunes:category text="<?php echo esc_attr( $channel['category'] ); ?>">
			<?php if ( ! empty( $channel['subcategory'] ) ) : ?>
			<itunes:category text="<?php echo esc_attr( $channel['subcategory'] ); ?>"/>
			<?php endif; ?>
		</itunes:category>
		<?php
		foreach ( $posts as $post ) {
			$item = $this->build_item_data( $post );
			$item = apply_filters( 'prc_spoken_article_podcast_item', $item, $post );
			if ( empty( $item['audioUrl'] ) ) {
				continue;
			}
			$this->render_item( $item );
		}
		?>
	</channel>
</rss>
		<?php
	}

	/**
	 * Build the item data array for a post.
	 *
	 * @param WP_Post $post The post object.
	 * @return array<string, mixed> Item data.
	 */
	private function build_item_data( WP_Post $post ): array {
		$spoken   = get_post_meta( $post->ID, Post_Meta::META_KEY, true );
		$audio_url = $spoken['audio_url'] ?? '';
		$duration  = $spoken['duration'] ?? '';
		$attach_id = (int) ( $spoken['attachment_id'] ?? 0 );

		$audio_length = 0;
		if ( $attach_id > 0 ) {
			$meta = wp_get_attachment_metadata( $attach_id );
			if ( ! empty( $meta['filesize'] ) ) {
				$audio_length = (int) $meta['filesize'];
			} else {
				$path = get_attached_file( $attach_id );
				if ( $path && is_readable( $path ) ) {
					$size = filesize( $path );
					if ( false !== $size ) {
						$audio_length = $size;
					}
				}
			}
		}

		$excerpt = has_excerpt( $post->ID )
			? get_the_excerpt( $post->ID )
			: wp_trim_words( wp_strip_all_tags( $post->post_content ), 55 );

		$thumb_url = '';
		$thumb_id  = get_post_thumbnail_id( $post->ID );
		if ( $thumb_id ) {
			$thumb = wp_get_attachment_image_src( $thumb_id, 'medium' );
			if ( ! empty( $thumb[0] ) ) {
				$thumb_url = $thumb[0];
			}
		}

		return array(
			'title'       => get_the_title( $post->ID ),
			'link'        => get_permalink( $post->ID ),
			'description' => $excerpt,
			'pubDate'     => get_post_time( 'D, d M Y H:i:s +0000', true, $post ),
			'guid'        => get_permalink( $post->ID ),
			'audioUrl'    => $audio_url,
			'audioType'   => 'audio/mpeg',
			'audioLength' => $audio_length,
			'duration'    => $duration,
			'image'       => $thumb_url,
			'summary'     => $excerpt,
		);
	}

	/**
	 * Render a single item as RSS XML.
	 *
	 * @param array<string, mixed> $item Item data from build_item_data (filtered).
	 */
	private function render_item( array $item ): void {
		?>
		<item>
			<title><?php echo esc_html( $item['title'] ); ?></title>
			<link><?php echo esc_url( $item['link'] ); ?></link>
			<description><![CDATA[<?php echo wp_kses_post( $item['description'] ); ?>]]></description>
			<pubDate><?php echo esc_html( $item['pubDate'] ); ?></pubDate>
			<guid isPermaLink="true"><?php echo esc_url( $item['guid'] ); ?></guid>
			<enclosure url="<?php echo esc_url( $item['audioUrl'] ); ?>" length="<?php echo (int) $item['audioLength']; ?>" type="<?php echo esc_attr( $item['audioType'] ); ?>"/>
			<?php if ( ! empty( $item['duration'] ) ) : ?>
			<itunes:duration><?php echo esc_html( $item['duration'] ); ?></itunes:duration>
			<?php endif; ?>
			<?php if ( ! empty( $item['summary'] ) ) : ?>
			<itunes:summary><![CDATA[<?php echo wp_kses_post( $item['summary'] ); ?>]]></itunes:summary>
			<?php endif; ?>
			<?php if ( ! empty( $item['image'] ) ) : ?>
			<itunes:image href="<?php echo esc_url( $item['image'] ); ?>"/>
			<?php endif; ?>
		</item>
		<?php
	}
}
