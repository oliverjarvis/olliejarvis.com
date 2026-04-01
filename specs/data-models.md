# Data Models

All types are defined in `src/app/nihongo/types.ts`.

## Core Types

### VocabWord

A vocabulary item attached to a conversation exchange.

```typescript
{
  word: string       // Dictionary form (kanji)
  reading: string    // Hiragana reading
  meaning: string    // English meaning
}
```

### Conversation

A complete conversation scenario (scripted or AI-generated).

```typescript
{
  id: string                    // Unique ID (e.g. "cafe-order", "ai-1711234567890")
  title: string                 // Japanese title
  titleEn: string               // English title
  level: "beginner" | "intermediate" | "advanced"
  speaker: string               // Speaker name in Japanese
  speakerDescription: string    // English description of the speaker's role
  exchanges: ConversationExchange[]
}
```

### ConversationExchange

One turn in a conversation: speaker message → quiz → learner response.

```typescript
{
  speakerMessage: string              // What the speaker says (Japanese)
  speakerMessageTranslation: string   // English translation
  question: string                    // Comprehension question (Japanese)
  questionTranslation: string         // English translation of question
  choices: string[]                   // 4 multiple-choice answers (Japanese)
  choiceTranslations: string[]        // English translations of choices
  correctChoiceIndex: number          // 0-3
  suggestedAnswer: string             // Model response for the learner (Japanese)
  suggestedAnswerTranslation: string  // English translation
  answerParts: string[]               // 4-8 phrase chunks for scramble mode
  vocabulary: VocabWord[]             // 4-7 key words from the message
}
```

### WordJournalEntry

Tracks a single vocabulary word across all encounters.

```typescript
{
  id: string               // Same as word (dictionary form)
  word: string             // Dictionary form
  reading: string          // Hiragana
  meaning: string          // English (may be empty if not yet resolved)
  pos: string              // Part of speech (Japanese: 名詞, 動詞, etc.)
  jlptLevel: number        // 5=N5, 4=N4, 3=N3, 2=N2, 1=N1, 0=unknown
  encounterCount: number   // Total times seen across all conversations
  conversationIds: string[] // Which conversations this word appeared in
  firstSeen: number        // Timestamp
  lastSeen: number         // Timestamp
  naturallyAcquired: boolean // true when encounterCount >= 50
  bookmarked: boolean      // User-flagged for active study
}
```

### LearnerProfile

The learner's cumulative state, rebuilt from journal data and serialized to AI prompts.

```typescript
{
  estimatedLevel: "N5" | "N4" | "N3" | "N2" | "N1"
  totalWords: number                    // Unique words in journal
  wordsByLevel: Record<number, number>  // Count per JLPT level (0-5)
  acquiredWords: number                 // Words with 50+ encounters
  grammarPatternsSeen: string[]         // Up to 50 most frequent patterns
  grammarToIntroduce: string[]          // Up to 3 new patterns for next conversation
  wordsToTeach: string[]                // Up to 8 unseen JLPT words to scaffold
  conversationsCompleted: number
  recentTopics: string[]                // Last 5 conversation topics
  reinforcementWords: string[]          // Up to 20 words seen 2-4x for natural reuse
  mcAccuracy: number                    // 0-1, exponential moving average (α=0.1)
  mcTotal: number                       // Total quiz questions answered
  startedAt: number                     // Timestamp of profile creation
}
```

### GrammarPatternEntry

Tracks a morphological grammar pattern's encounter frequency (legacy system).

```typescript
{
  pattern: string          // Human-readable label (e.g. "past", "te-form")
  encounterCount: number
  firstSeen: number        // Timestamp
}
```

### GrammarPointJournalEntry

Tracks encounter with a specific grammar point from the 935-point database.

```typescript
{
  id: number               // Grammar point ID from grammar-points-db
  name: string             // Japanese grammar form (e.g. "ので", "たい")
  meaning: string          // English meaning
  jlptLevel: number        // 5=N5...1=N1, 0=non-JLPT
  encounterCount: number   // Total times detected across conversations
  conversationIds: string[]
  firstSeen: number        // Timestamp
  lastSeen: number         // Timestamp
  naturallyAcquired: boolean // encounterCount >= 5
  bookmarked: boolean
}
```

### KuromojiToken

A morpheme from the tokenizer, possibly merged with auxiliary morphemes.

```typescript
{
  surface_form: string    // Text as it appears
  reading: string         // Hiragana reading
  basic_form: string      // Dictionary form
  pos: string             // Part of speech (Japanese)
  pos_detail_1: string    // Subcategory
  grammar_note?: string   // Merged grammar labels (e.g. "past", "te-form, polite")
}
```

### ConversationRecord

A lightweight record of a completed conversation, stored in history.

```typescript
{
  id: string
  title: string
  level: string
  topic: string
  completedAt: number         // Timestamp
  newWordsIntroduced: number
  exchangeCount: number
}
```

## UI Types

```typescript
type GamePhase =
  | "select"           // Conversation list
  | "reading"          // Show speaker message
  | "quiz"             // Multiple choice question
  | "quiz_result"      // Show correct/incorrect
  | "mode_select"      // Choose answer mode
  | "answering"        // Input answer
  | "answer_feedback"  // AI feedback on answer
  | "complete"         // Conversation finished

type AnswerMode = "scramble" | "freetext" | "hybrid"

interface DisplayMessage {
  speaker: string
  text: string
  isUser: boolean
  translation: string
}
```

## Storage Schema

All data persists in Supabase PostgreSQL, in the `user_data` table (one row per user). Each column is JSONB.

| Column | Type | Description |
|--------|------|-------------|
| `learner_profile` | `LearnerProfile` | Current learner state |
| `word_journal` | `Record<string, WordJournalEntry>` | All vocabulary, keyed by dictionary form |
| `grammar_patterns` | `Record<string, GrammarPatternEntry>` | Morphological patterns, keyed by lowercase label |
| `grammar_points_journal` | `Record<string, GrammarPointJournalEntry>` | 935-point grammar tracking, keyed by ID |
| `conversation_history` | `ConversationRecord[]` | Last 200 completed conversations |
| `saved_conversations` | `Record<string, SavedConversation>` | Message history for replay, keyed by conversation ID |
| `ai_conversations` | `Conversation[]` | AI-generated conversation definitions |

Row Level Security ensures users can only access their own data. Schema is declared in `supabase/schemas/001_user_data.sql`.

### Storage Pruning

- **Word journal**: `conversationIds` trimmed to last 3 for words with 10+ encounters.
- **Grammar points journal**: Same pruning as word journal.
- **Conversation history**: Capped at 200 records (oldest dropped).
