# PRC Spoken Article

AI-generated audio narration for posts, powered by ElevenLabs TTS with an optional AI summarization step ("Listener's Digest").

## Overview

Editors generate spoken versions of articles from the block editor sidebar. The plugin extracts post content as plain text, optionally condenses it to ~600 words via the WordPress AI Client, then sends it to ElevenLabs for text-to-speech conversion. The resulting audio file is uploaded to the media library and rendered through an Interactivity API audio player block.

### Dependencies

- **Upstream**: `prc-schema-seo` (AudioObject schema), `prc-markdown-for-agents` (text extraction, optional), `wordpress/ai-client` (summarization, optional)
- **External**: [ElevenLabs](https://elevenlabs.io) TTS API

## Local Development

### Prerequisites

- Node.js 22+, npm 10.9+
- PRC Platform monorepo bootstrapped (`npm run bootstrap` from repo root)
- `PRC_PLATFORM_ELEVENLABS_API_KEY` defined (see below)

### Environment Variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `PRC_PLATFORM_ELEVENLABS_API_KEY` | ElevenLabs API key | Defined in `vip-config/keys-and-tokens.php`, sourced from VIP env vars |

### Build & Dev

Run from the repo root:

```bash
# Build everything
npm run build:all -w @prc/spoken-article

# Watch player block
npm run start -w @prc/spoken-article

# Watch sidebar panel
npm run start:sidebar -w @prc/spoken-article
```

Two separate entry points are built: `player-block` (the frontend block + editor) and `sidebar` (the editor sidebar panel).

## Architecture

```
prc-spoken-article.php          → Plugin bootstrap
includes/
  class-bootstrap.php           → Loader, post type support registration
  class-post-meta.php           → spoken_article + play count meta
  class-rest-api.php            → REST routes (play count, voice, TTS text)
  class-schema.php              → AudioObject schema via prc-schema-seo
  class-wp-admin.php            → Editor sidebar asset enqueue + localization
src/
  player-block/                 → Interactivity API audio player block
  sidebar/                      → Editor sidebar panel (generation, voice picker)
```

### Key Classes

| Class | Responsibility |
|-------|----------------|
| `Bootstrap` | Wires all classes, registers `prc-spoken-article` post type support for `post` |
| `Post_Meta` | Registers `spoken_article` (object) and `spoken_article_play_count` (int) meta |
| `Rest_API` | Three REST routes: play count increment, voice selection, TTS text extraction |
| `Schema` | Adds `AudioObject` to post schema via `prc_schema_seo_post_schema` filter |
| `WP_Admin` | Enqueues sidebar assets, localizes ElevenLabs config and REST endpoints |
| `Player_Block` | Registers the `prc-spoken-article/player` block (server-rendered from post meta) |

### Data Flow

1. **Text extraction** — `Rest_API::get_text_for_tts()` converts post content to plain text. Prefers `prc-markdown-for-agents` Markdown_Converter; falls back to `the_content` + tag stripping.
2. **Summarization** — If the WordPress AI Client is available, the text is condensed into a ~600-word "Listener's Digest" optimized for spoken delivery.
3. **TTS** — The sidebar JS calls ElevenLabs client-side (`/v1/text-to-speech/{voiceId}`), receives audio, and uploads it to the WP media library via `wp/v2/media`.
4. **Storage** — Audio metadata is saved to `spoken_article` post meta (`{ attachment_id, audio_url, duration }`).
5. **Playback** — The player block reads post meta server-side and renders an Interactivity API player with play/pause, seek, skip ±15s, speed control, and session persistence.

### REST API

Namespace: `prc-spoken-article/v1`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/play-count/{post_id}` | Public | Increment play count |
| POST | `/voice` | `manage_options` | Save ElevenLabs voice ID |
| GET | `/tts-text/{post_id}` | `edit_posts` | Return TTS-ready text for a post |

### Data Storage

| Type | Key | Shape | Purpose |
|------|-----|-------|---------|
| Post meta | `spoken_article` | `{ attachment_id, audio_url, duration }` | Audio file reference |
| Post meta | `spoken_article_play_count` | `int` | Frontend play count |
| Option | `elevenlabs_voice_id` | `string` | Selected ElevenLabs voice |
| Option | `elevenlabs_model` | `string` | TTS model (default: `eleven_monolingual_v1`) |
| Option | `elevenlabs_stability` | `float` | Voice stability (default: `0.5`) |
| Option | `elevenlabs_similarity_boost` | `float` | Similarity boost (default: `0.75`) |
| Session storage | `prc-spoken-article-playback` | JSON | Playback position/rate, expires after 24h |

### Post Type Support

The plugin registers a custom post type support flag: `prc-spoken-article`. By default only `post` is supported. To enable for another post type:

```php
add_post_type_support( 'your-cpt', 'prc-spoken-article' );
```

All meta registration, sidebar visibility, and schema output key off this flag.

## Hooks

### Filters provided

| Filter | Parameters | Purpose |
|--------|------------|---------|
| `prc_schema_seo_post_schema` | `$schema, $post_id, $seo_data` | Adds AudioObject when spoken article meta exists |

## Gotchas

- **TTS calls are client-side** — The ElevenLabs API key is localized to the editor JS. Generation happens in the browser, not on the server.
- **Summarization is server-side** — The `/tts-text` endpoint handles AI condensation before returning text to the client.
- **Block sources differ by environment** — In local dev (`wp_get_environment_type() === 'local'`), block PHP is loaded from `src/`; otherwise from `build/`.
- **One block per post** — `block.json` sets `multiple: false`. Audio data lives in post meta, not block attributes.
- **Play count has no auth** — The increment endpoint is public to support anonymous frontend tracking.
- **Session persistence** — The frontend player saves playback state to `sessionStorage` and resumes on page navigation. State expires after 24 hours.
