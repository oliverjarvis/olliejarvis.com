# API Routes

All routes live under `src/app/api/nihongo/`. Each is a Next.js Route Handler.

## POST `/api/nihongo/converse`

Real-time AI conversation. Claude plays a character and responds to the learner turn by turn.

**Input:**

```json
{
  "speaker": "田中さん",
  "speakerDescription": "A friendly barista at a Tokyo café",
  "topic": "Ordering coffee",
  "level": "N5",
  "conversationHistory": [
    { "role": "speaker", "text": "いらっしゃいませ！", "translation": "Welcome!" },
    { "role": "user", "text": "コーヒーをください", "translation": "" }
  ],
  "userMessage": "コーヒーをください",
  "learnerProfile": "<serialized profile string>",
  "isFirstMessage": false
}
```

**Output:** A `ConversationExchange` object plus `shouldEnd: boolean`.

**Behavior:**
- On `isFirstMessage: true`, Claude opens the conversation as the character.
- On subsequent turns, full `conversationHistory` is replayed so Claude has context.
- `shouldEnd` is set to `true` after 4-6 exchanges or when the learner says goodbye.
- Kanji enforcement: Claude must always use kanji where a native speaker would.
- Quiz distractors use vocabulary from the message (no keyword-elimination shortcuts).
- Model: `claude-opus-4-6`, max 1000 tokens.

---

## POST `/api/nihongo/generate`

Generates a complete scripted conversation for offline use.

**Input:**

```json
{
  "topic": "Visiting a temple",
  "level": "N4",
  "learnerProfile": "<serialized profile string>"
}
```

**Output:**

```json
{
  "conversation": { /* Conversation object with 4-5 exchanges */ }
}
```

**Behavior:**
- If `topic` is omitted, Claude picks an everyday scenario.
- Learner profile drives vocabulary calibration: ~90% known words, ~10% new.
- `answerParts` are 4-8 meaningful phrase chunks (not individual morphemes).
- Model: `claude-opus-4-6`, max 4096 tokens, 60s timeout.

---

## POST `/api/nihongo/feedback`

Evaluates the learner's Japanese answer against the suggested response.

**Input:**

```json
{
  "userAnswer": "はい、大きいのをお願いします",
  "suggestedAnswer": "大きいサイズをお願いします",
  "suggestedTranslation": "A large size, please",
  "context": "Ordering at a café"
}
```

**Output:**

```json
{
  "isValid": true,
  "feedback": "Natural response! お願いします is perfect here.",
  "grammarTip": "の can replace a noun when the context is clear."
}
```

**Behavior:**
- Warm, encouraging tone. Max 2-3 sentences.
- `grammarTip` is optional — included only when relevant.
- Judges semantic validity, not exact match.

---

## POST `/api/nihongo/tokenize`

Morphological analysis using Kuromoji.

**Input:**

```json
{ "text": "東京に行きました" }
```

**Output:**

```json
{
  "tokens": [
    { "surface_form": "東京", "reading": "とうきょう", "basic_form": "東京", "pos": "名詞", "pos_detail_1": "固有名詞" },
    { "surface_form": "に", "reading": "に", "basic_form": "に", "pos": "助詞", "pos_detail_1": "格助詞" },
    { "surface_form": "行きました", "reading": "いきました", "basic_form": "行く", "pos": "動詞", "pos_detail_1": "自立", "grammar_note": "polite, past" }
  ]
}
```

**Behavior:**
- Kuromoji tokenizer is initialized once and cached in memory.
- Auxiliary morphemes (助動詞) and dependent verbs (非自立) are merged into the preceding token.
- `grammar_note` is built from merged morphemes using lookup tables:
  - Auxiliary notes: ます→"polite", た→"past", ない→"negative", etc.
  - Non-independent verb notes: いる→"~ing (ongoing)", しまう→"end up ~ing", etc.
- Katakana readings are converted to hiragana.

---

## GET `/api/nihongo/tts`

Text-to-speech audio generation.

**Query:** `?text=こんにちは`

**Output:** MP3 audio stream (`audio/mpeg`).

**Behavior:**
- Voice: `ja-JP-NanamiNeural` (MS Edge TTS).
- Format: 24kHz, 96kbps mono MP3.
- HTTP cache: `Cache-Control: public, max-age=604800` (7 days).
- GET method enables CDN caching.

---

## POST `/api/nihongo/grammar`

AI-powered grammar breakdown of a Japanese sentence.

**Input:**

```json
{ "text": "明日友達と映画を見に行きます" }
```

**Output:**

```json
{
  "breakdown": [
    { "part": "明日", "role": "time", "reading": "あした", "meaning": "tomorrow" },
    { "part": "友達と", "role": "companion", "reading": "ともだちと", "meaning": "with a friend" },
    { "part": "映画を", "role": "object", "reading": "えいがを", "meaning": "a movie" },
    { "part": "見に", "role": "purpose", "reading": "みに", "meaning": "to watch" },
    { "part": "行きます", "role": "verb", "reading": "いきます", "meaning": "will go" }
  ],
  "structure": "Time + Companion + Object + Purpose + Verb",
  "note": "見に行く is a common pattern: verb stem + に + 行く means 'go to do something'."
}
```

---

## POST `/api/nihongo/grammar-detect`

Two-stage grammar point detection — LLM confirmation of candidate grammar points in a sentence.

**Input:**

```json
{
  "sentence": "今日は寒いので、コートを着ます。",
  "candidates": [
    { "id": 3, "name": "は", "meaning": "Topic marker" },
    { "id": 53, "name": "ので", "meaning": "Because" },
    { "id": 19, "name": "ます", "meaning": "Polite verb endings" }
  ]
}
```

**Output:**

```json
{ "confirmedIds": [3, 53, 19] }
```

**Behavior:**
- Candidates are pre-filtered client-side from 935 grammar points down to ~30-50 per sentence.
- Claude Sonnet confirms which candidates are genuinely used in the sentence.
- Only confirms patterns actually demonstrated, not just words appearing.
- Max 200 tokens response. Runs in background, doesn't block UI.

---

## POST `/api/nihongo/lookup`

Dictionary lookup via ichi.moe scraping.

**Input:**

```json
{ "word": "食べる" }
```

**Output:**

```json
{
  "results": [
    { "word": "食べる", "reading": "たべる", "definitions": ["to eat", "to live on"] }
  ]
}
```

**Behavior:**
- Scrapes HTML from ichi.moe.
- Returns up to 5 results.
