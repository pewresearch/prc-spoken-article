# Spoken Article Player Block

Minimalistic audio player for AI-generated spoken article narration, built on the WordPress Interactivity API.

## Usage

Add the **Spoken Article** block from the Media category in the block editor. The block renders only when the post has valid `spoken_article` meta (generated via the editor sidebar panel).

One instance per post (`multiple: false`). Audio data comes from post meta, not block attributes.

## Block Details

- **Name**: `prc-spoken-article/player`
- **Category**: Media
- **Context**: `postId`
- **Supports**: anchor, spacing (margin top/bottom, padding)

## Frontend Player

The player uses the `prc-spoken-article/player` Interactivity API store. Features:

- Trigger button (headphones icon + duration) that opens a `<dialog>` player
- Play/pause, seek slider, skip ±15s
- Playback speed control (0.5x–2x)
- Expand/collapse for compact or full layout
- Media Session API integration (lock screen / notification controls)
- Session persistence via `sessionStorage` — resumes position and rate across page navigations (24h expiry)
- Play count tracking (POST to `/prc-spoken-article/v1/play-count/{post_id}` + `gtag` event when available)

## Server Rendering

The block is dynamic — `save.js` returns `null`. PHP renders the player template from post meta:

| Meta key | Field | Purpose |
|----------|-------|---------|
| `spoken_article` | `attachment_id` | Media library attachment ID |
| `spoken_article` | `audio_url` | Direct URL to the audio file |
| `spoken_article` | `duration` | Human-readable duration (e.g. `"4:32"`) |

If `attachment_id` or `audio_url` is missing, the block renders nothing.

## Files

| File | Purpose |
|------|---------|
| `block.json` | Block metadata |
| `class-player-block.php` | PHP registration and render callback |
| `edit.jsx` | Editor preview (shows duration or "no audio" placeholder) |
| `index.js` | Block registration |
| `view.js` | Interactivity API store (all frontend playback logic) |
| `style.scss` | Frontend styles |
| `editor.scss` | Editor-only styles |
