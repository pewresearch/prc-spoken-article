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
# Build (Turbo, from repo root)
npx turbo build --filter=@prc/spoken-article

# Watch player block
npm run start -w @prc/spoken-article

# Watch sidebar panel
npm run start:sidebar -w @prc/spoken-article
```

Entry points include `player-block`, `parent-sidebar`, `document-sidebar`, and `interstitial-admin` (Spoken Article → **Settings** admin UI).

## Architecture

```
prc-spoken-article.php          → Plugin bootstrap
includes/
  class-bootstrap.php           → Loader, post type support registration
  class-post-meta.php           → spoken_article + play count meta
  class-rest-api.php            → REST routes (play count, ElevenLabs proxy, TTS text)
  class-elevenlabs-settings.php → API key + draft/production model options
  class-elevenlabs-tts.php      → Server-side ElevenLabs HTTP client
  class-voice.php               → Proxied voice list/detail + transients
  class-interstitial-ads.php      → Mid-roll ads admin + weighted selection REST
  class-schema.php              → AudioObject schema via prc-schema-seo
  class-wp-admin.php            → Editor sidebar asset enqueue + localization
src/
  player-block/                 → Interactivity API audio player block
  parent-sidebar/               → Spoken Article panel on supported parent posts
  document-sidebar/             → CPT document sidebar (voice, interstitial overrides)
  interstitial-admin/           → Settings screen (ElevenLabs + global interstitial ads)
```

### Key Classes

| Class | Responsibility |
|-------|----------------|
| `Bootstrap` | Wires all classes, registers `prc-spoken-article` post type support for `post` |
| `Post_Meta` | Registers `spoken_article` (object) and `spoken_article_play_count` (int) meta |
| `Rest_API` | Play count, TTS text, ElevenLabs proxy routes, spoken-article CPT helpers |
| `ElevenLabs_Settings` | Resolves API key (constant vs option), draft/production models, admin payload |
| `ElevenLabs_TTS` | POSTs to ElevenLabs from PHP; used by `/elevenlabs/tts` |
| `Interstitial_Ads` | **Spoken Article → Settings** React admin; `GET/POST /interstitial-ads` |
| `Schema` | Adds `AudioObject` to post schema via `prc_schema_seo_post_schema` filter |
| `WP_Admin` | Enqueues sidebar assets, localizes ElevenLabs config and REST endpoints |
| `Player_Block` | Registers the `prc-spoken-article/player` block (server-rendered from post meta) |

### Data Flow

1. **Text extraction** — `Rest_API::get_text_for_tts()` converts post content to plain text. Prefers `prc-markdown-for-agents` Markdown_Converter; falls back to `the_content` + tag stripping.
2. **Summarization** — If the WordPress AI Client is available, the text is condensed into a ~600-word "Listener's Digest" optimized for spoken delivery.
3. **TTS** — Editor JS calls `POST /elevenlabs/tts` (server holds the ElevenLabs API key), receives `audio/mpeg`, then uploads to the WP media library via `wp/v2/media`. The API key is never localized to the browser.
4. **Storage** — Audio metadata is saved to `spoken_article` post meta (`{ attachment_id, audio_url, duration }`).
5. **Playback** — The player block reads post meta server-side and renders an Interactivity API player with play/pause, seek, skip ±15s, speed control, and session persistence.

### REST API

Namespace: `prc-spoken-article/v1`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/play-count/{post_id}` | Public | Increment play count |
| POST | `/voice` | `manage_options` | Save default ElevenLabs voice ID |
| GET/POST | `/interstitial-ads` | `manage_options` | Read/save global interstitial ads + ElevenLabs site settings |
| GET | `/interstitial-for-post/{post_id}` | Public | Resolve interstitial audio for the player |
| GET | `/elevenlabs/voices` | `edit_posts` | Proxied voice list (cached 1 day; `?refresh=1` for `manage_options`) |
| GET | `/elevenlabs/voices/{voice_id}` | `edit_posts` | Proxied single voice (cached 1 day) |
| POST | `/elevenlabs/tts` | `edit_posts` | Proxied TTS; returns raw `audio/mpeg` |
| GET | `/tts-text/{post_id}` | `edit_posts` | Return TTS-ready text for a post |

### Data Storage

| Type | Key | Shape | Purpose |
|------|-----|-------|---------|
| Post meta | `spoken_article` | `{ attachment_id, audio_url, duration }` | Audio file reference |
| Post meta | `spoken_article_play_count` | `int` | Frontend play count |
| Post meta | `spoken_article_voice_id` | `string` | Per-article ElevenLabs voice override |
| Post meta | `spoken_article_audio_quality` | `string` | Attached audio tier: `draft`, `production`, or empty |
| Post meta | `spoken_article_model` | `string` | Legacy per-article model override (deprecated; site tiers used instead) |
| Option | `elevenlabs_api_key` | `string` | ElevenLabs API key (fallback when `PRC_PLATFORM_ELEVENLABS_API_KEY` is not defined) |
| Option | `elevenlabs_voice_id` | `string` | Selected ElevenLabs voice |
| Option | `elevenlabs_draft_model` | `string` | Draft TTS model (default: `eleven_flash_v2_5`) |
| Option | `elevenlabs_model` | `string` | Production TTS model (default: `eleven_multilingual_v2`) |
| Option | `elevenlabs_stability` | `float` | Voice stability (default: `0.5`) |
| Option | `elevenlabs_similarity_boost` | `float` | Similarity boost (default: `0.75`) |
| Session storage | `prc-spoken-article-playback` | JSON | Playback position/rate, expires after 24h |

### Post Type Support

The plugin registers a custom post type support flag: `prc-spoken-article`. By default only `post` is supported. To enable for another post type:

```php
add_post_type_support( 'your-cpt', 'prc-spoken-article' );
```

All meta registration, sidebar visibility, and schema output key off this flag.

### ElevenLabs settings and audio tiers

Site-wide ElevenLabs configuration lives on **Spoken Article → Settings** (`edit.php?post_type=spoken-article&page=spoken-article-interstitials`). The screen uses the shared DataForm/settings pattern and persists via `POST /interstitial-ads` (models and API key are saved in the same request as interstitial ads).

| Tier | Option | Default model | Typical use |
|------|--------|---------------|-------------|
| Draft | `elevenlabs_draft_model` | `eleven_flash_v2_5` | Fast preview audio in the editor |
| Production | `elevenlabs_model` | `eleven_multilingual_v2` | Published spoken-article audio |

Per-article `spoken_article_audio_quality` (`draft` or `production`) selects which model the generation flow passes to `/elevenlabs/tts`. Voice previews in the picker also use the proxied TTS route so the API key never ships to the browser.

## Hooks

### Filters provided

| Filter | Parameters | Purpose |
|--------|------------|---------|
| `prc_schema_seo_post_schema` | `$schema, $post_id, $seo_data` | Adds AudioObject when spoken article meta exists |

## Gotchas

- **ElevenLabs traffic is server-proxied** — Editor JS calls `POST /elevenlabs/tts` and voice list endpoints on `prc-spoken-article/v1`. Only `connected`, `voiceId`, and model IDs are localized (`elevenlabs.connected`); the API key stays in PHP (`PRC_PLATFORM_ELEVENLABS_API_KEY` or `elevenlabs_api_key` option).
- **Summarization is server-side** — The `/tts-text` endpoint handles AI condensation before returning text to the client.
- **Block sources differ by environment** — In local dev (`wp_get_environment_type() === 'local'`), block PHP is loaded from `src/`; otherwise from `build/`.
- **One block per post** — `block.json` sets `multiple: false`. Audio data lives in post meta, not block attributes.
- **Play count has no auth** — The increment endpoint is public to support anonymous frontend tracking.
- **Session persistence** — The frontend player saves playback state to `sessionStorage` and resumes on page navigation. State expires after 24 hours.
