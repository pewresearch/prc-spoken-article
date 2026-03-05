# Spoken Article Block

A WordPress block that provides AI-generated audio narration of article content using the Interactivity API for a minimalistic frontend player.

## Features

- **Server-Side AI Generation**: Uses WordPress Abilities API for server-side ability registration
- **ElevenLabs Integration**: Converts post text to speech using ElevenLabs REST API
- **Media Library Integration**: Audio files are uploaded to the media library and attached to the post
- **Minimalistic Player**: Clean, accessible audio player interface on the frontend
- **Schema.org Integration**: Automatically adds AudioObject schema markup via prc-schema-seo filters
- **Interactivity API**: Frontend interactivity powered by WordPress Interactivity API

## Requirements

- PRC Platform Core
- WordPress AI plugin (for AI experiment functionality)
- PRC Schema SEO plugin (for schema.org integration)
- ElevenLabs API key (configured via VIP environment variable)

## Usage

### Configure ElevenLabs API Key

The ElevenLabs API key must be configured as an environment variable:

**Environment Variable:**
- `PRC_PLATFORM_ELEVENLABS_API_KEY` - Your ElevenLabs API key (required)

This is defined in `vip-config/keys-and-tokens.php` and loaded from VIP environment variables.

**Optional WordPress Options:**
The following options can be configured in WordPress admin (or via wp-config):
- `elevenlabs_voice_id` - Voice ID (default: 'EXAVITQu4vr4xnSDxMaL')
- `elevenlabs_model` - Model ID (default: 'eleven_monolingual_v1')
- `elevenlabs_stability` - Voice stability 0-1 (default: 0.5)
- `elevenlabs_similarity_boost` - Voice similarity boost 0-1 (default: 0.75)

### Enable the AI Experiment

1. Navigate to **Settings > AI Experiments** in WordPress admin
2. Enable the "Spoken Article Generation" experiment

### Add the Block

1. Edit a post or page
2. Add the **Spoken Article** block from the Media category
3. In the block inspector sidebar, find the "AI Generation" panel
4. Click "Generate with AI" to create audio narration from the post content
5. The block will display a minimalistic audio player on the frontend

## Technical Details

### Block Structure

- **Name**: `prc-spoken-article/player`
- **Category**: Media
- **Supports**: Anchor, spacing controls
- **Attributes**:
  - `audioId` (number): Media library attachment ID
  - `audioUrl` (string): Audio file URL
  - `duration` (string): Human-readable duration

### Frontend Player

The player uses the WordPress Interactivity API for state management:

- Play/pause button with SVG icons
- Duration display
- Hidden audio element for playback
- Responsive design

### AI Integration (Server-Side)

The AI experiment consists of:

1. **Ability**: `prc-spoken-article/generate` (registered server-side)
   - Fetches post content from WordPress database
   - Extracts plain text from HTML using `wp_strip_all_tags()`
   - Calls ElevenLabs REST API using `wp_remote_post()`
   - Uploads audio to media library with `wp_insert_attachment()`
   - Returns audio ID, URL, and duration

2. **Experiment**: `generate-spoken-article`
   - Registers server-side ability via `wp_abilities_api_init` hook
   - Enqueues editor script with inspector panel
   - Provides ability name via `wp_localize_script`
   - Injects AI generation UI via `editor.BlockEdit` filter

### Schema.org Integration

The block automatically adds AudioObject schema to posts via the `prc_schema_seo_post_schema` filter when:

- The post contains a spoken article block
- The block has valid audio ID and URL

Schema properties:
- `@type`: AudioObject
- `contentUrl`: Audio file URL
- `encodingFormat`: audio/mpeg
- `name`: Post title
- `description`: "Spoken article narration"

## Files

### Block Files
- `block.json` - Block metadata
- `class-spoken-article.php` - PHP block class
- `edit.jsx` - Editor component
- `index.js` - Block registration
- `view.js` - Interactivity API store
- `style.scss` - Frontend styles
- `editor.scss` - Editor styles

### AI Experiment Files
- `includes/ai-experiments/class-generate-spoken-article.php` - Server-side ability class
- `includes/ai-experiments/class-generate-spoken-article-experiment.php` - Experiment class
- `includes/ai-experiments/src/generate-spoken-article/index.tsx` - Editor filter for AI panel
- `includes/ai-experiments/src/generate-spoken-article/ai-generate-spoken-article.tsx` - UI component
- `includes/ai-experiments/src/generate-spoken-article/block.json` - Experiment metadata

## Development

The block is registered in the plugin bootstrap:
`plugins/prc-spoken-article/includes/class-bootstrap.php`

The AI experiment is registered in:
`plugins/prc-spoken-article/includes/ai-experiments/class-ai-experiments.php`

## Notes

- The block can only be added once per post (`multiple: false`)
- Audio generation requires the AI experiment to be enabled AND a valid ElevenLabs API key
- Audio files are attached to the parent post in the media library
- The block doesn't render on the frontend if no audio is set
- The ability is registered server-side using WordPress Abilities API
- ElevenLabs REST API is called server-side using `wp_remote_post()`
- Audio files are written to uploads directory and registered with `wp_insert_attachment()`
