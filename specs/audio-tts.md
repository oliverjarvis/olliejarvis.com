# Audio & Text-to-Speech

Every piece of Japanese text in the app is audible. TTS runs through a two-tier system with caching at multiple levels.

## Primary: MS Edge TTS

**Endpoint:** `GET /api/nihongo/tts?text=...`

| Setting | Value |
|---------|-------|
| Voice | `ja-JP-NanamiNeural` |
| Format | 24kHz, 96kbps mono MP3 |
| Library | `edge-tts` (Node.js) |

The API route streams MP3 audio in the response body with `Content-Type: audio/mpeg`.

## Fallback: Web Speech API

If the Edge TTS request fails, the client falls back to the browser's built-in speech synthesis:

| Setting | Value |
|---------|-------|
| Language | `ja-JP` |
| Rate | 0.85 (slightly slower for learners) |
| Voice | Auto-selected Japanese voice |

## Caching

### In-Memory (Client)

A `Map<string, string>` maps text to blob URLs. When the same text is requested again in the same session, the cached blob URL is reused without a network request.

### HTTP Cache (CDN)

The TTS endpoint returns:
```
Cache-Control: public, max-age=604800
```

This enables 7-day caching at any CDN or browser cache layer. The GET method (not POST) ensures cache compatibility.

## UI Integration

### AudioButton

A reusable component that:
1. Shows a speaker icon.
2. On click: checks in-memory cache → fetches from `/api/nihongo/tts` → plays audio.
3. Shows a loading spinner during fetch.
4. Toggles between play/pause during playback.

### Where Audio Appears

| Location | Trigger |
|----------|---------|
| Speaker messages | AudioButton next to each message |
| Multiple choice options | AudioButton on each choice |
| Vocabulary words | AudioButton in token popover |
| Conversation titles | AudioButton in header |
| Selected text | SelectionToolbar "Listen" button |

### SelectionToolbar

A floating toolbar that appears when the user selects Japanese text anywhere on the page. Provides a "Listen" button that sends the selected text to TTS.
