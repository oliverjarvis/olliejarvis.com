# Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript, React 19 |
| Styling | Tailwind CSS |
| AI | Anthropic Claude Opus 4.6 via `@anthropic-ai/sdk` |
| NLP | Kuromoji (morphological analysis, server-side) |
| TTS | MS Edge TTS (`edge-tts`), Web Speech API fallback |
| Icons | Lucide React |
| Persistence | Browser `localStorage` (no database) |

## Directory Layout

```
src/app/nihongo/
├── page.tsx                    # Entry point — renders Game + SelectionToolbar
├── types.ts                    # All TypeScript interfaces and type aliases
├── learner-profile.ts          # Profile CRUD, level estimation, prompt serialization
├── word-journal.ts             # Vocabulary tracking, bookmarking, cram filtering
├── grammar-patterns.ts         # Grammar pattern recording and retrieval
├── srs.ts                      # Legacy SRS (deprecated, kept for migration)
├── migration.ts                # One-time SRS → Word Journal migration
├── conversations.ts            # 17 built-in scripted conversations
├── highlight-context.tsx       # React context for grammar highlight intensity
├── components/
│   ├── Game.tsx                # Root state machine (~1050 lines)
│   ├── OnboardingFlow.tsx      # First-run level selection
│   ├── MessageBubble.tsx       # Chat message with translation toggle
│   ├── TokenizedText.tsx       # Renders tokens with hover popovers
│   ├── TokenWord.tsx           # Single token: reading, meaning, bookmark
│   ├── MultipleChoice.tsx      # 4-choice quiz UI
│   ├── AnswerPanel.tsx         # Scramble / freetext / hybrid input
│   ├── GrammarBreakdown.tsx    # Expandable grammar explanation
│   ├── AudioButton.tsx         # TTS play control
│   ├── WordJournalPanel.tsx    # Sidebar vocabulary manager
│   ├── CramSession.tsx         # Flashcard review mode
│   ├── ProfileDialog.tsx       # Learner stats and settings modal
│   ├── SelectionToolbar.tsx    # Floating toolbar on text selection
│   └── SRSPanel.tsx            # Legacy (unused)
└── data/
    └── jlpt-levels.ts          # ~3000+ words mapped to JLPT N5–N1

src/app/api/nihongo/
├── converse/route.ts           # Live AI conversation
├── generate/route.ts           # Full conversation generation
├── feedback/route.ts           # Answer evaluation
├── tokenize/route.ts           # Kuromoji morphological analysis
├── tts/route.ts                # Text-to-speech (Edge TTS)
├── grammar/route.ts            # AI grammar breakdown
└── lookup/route.ts             # Dictionary lookup (ichi.moe)
```

## Rendering Model

- **page.tsx** is a Server Component that renders client components.
- **Game.tsx** is the single client-side state machine. All UI phases, data fetching, and localStorage access originate here.
- API routes run server-side (Node.js). Claude API calls and Kuromoji tokenization happen exclusively on the server.

## Data Flow

```
User interaction
  → Game.tsx (phase transition)
    → fetch("/api/nihongo/...")
      → Claude API / Kuromoji / Edge TTS
    ← JSON response
  → State update → re-render
  → localStorage persistence (profile, journal, history)
```

## Key Design Decisions

1. **No database** — all learner data lives in `localStorage`. This keeps the app zero-auth and instant-start but limits cross-device sync.
2. **Single-page app within Next.js** — the nihongo subsystem is one route (`/nihongo`) with phase-based rendering, not multiple pages.
3. **Server-side NLP** — Kuromoji requires dictionary files (~20MB) loaded in Node.js; the tokenizer is initialized once and reused across requests.
4. **AI as curriculum engine** — Claude doesn't just chat; it receives a serialized learner profile (~200-300 tokens) and calibrates vocabulary, grammar, and difficulty to the learner's current state.

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Claude API access for all AI features |
