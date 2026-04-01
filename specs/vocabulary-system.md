# Vocabulary System

The vocabulary system tracks every Japanese word the learner encounters, replacing the earlier SRS approach with a natural-acquisition model.

## Word Journal

Defined in `word-journal.ts`. The journal is a `Record<string, WordJournalEntry>` keyed by dictionary form (basic_form from Kuromoji).

### Recording Words

`recordTokens(tokens, conversationId, vocabulary)` is called after every tokenization:

1. Skip punctuation tokens (`pos === "記号"` or regex match).
2. Key each token by `basic_form` (fallback to `surface_form`).
3. If the word exists: increment `encounterCount`, update `lastSeen`, add conversation ID, check acquisition threshold.
4. If new: create entry with JLPT level lookup, initial encounter count of 1, meaning from vocabulary list if available.

### Acquisition Model

Words progress through five stages based on encounter count, informed by SLA research on natural acquisition thresholds:

| Stage | Encounters | Meaning | Dot Color |
|-------|-----------|---------|-----------|
| New | 1-4 | Just seen | gray |
| Recognized | 5-9 | Starting to recognize | sky blue |
| Familiar | 10-19 | Partial understanding with context | amber |
| Learned | 20-49 | Can use with context | light emerald |
| Acquired | 50+ | Long-term retention | emerald |

Constants are defined in `src/app/nihongo/acquisition.ts` (`STAGE_THRESHOLDS`). The `naturallyAcquired` boolean on journal entries is set at 50+ encounters. The same model applies to grammar point journal entries.

### Hidden SRS

A spaced repetition system runs invisibly — the learner never sees SRS mechanics. Each acquisition stage has a review interval:

| Stage | Review Interval |
|-------|----------------|
| New | 1 day |
| Recognized | 3 days |
| Familiar | 7 days |
| Learned | 14 days |
| Acquired | 30 days |

During profile rebuild, `collectDueItems()` scans the word and grammar journals for items where `now - lastSeen > interval`. Due items are included in the AI prompt:
- **REVIEW**: up to 15 words due for spaced review
- **GRAMMAR REVIEW**: up to 10 grammar points due for review

Claude weaves these naturally into generated conversations. The learner encounters them again without knowing they were specifically scheduled. Intervals grow with mastery — new words come back daily, acquired words only monthly.

### Bookmarking

Users can bookmark words for focused study. Bookmarking creates a journal entry if the word isn't already tracked. Unbookmarking simply clears the flag.

### JLPT Level Lookup

`lookupJLPT(word)` in `data/jlpt-levels.ts` maps ~3000+ words to JLPT levels (5=N5 through 1=N1). Words not in the database get level 0 (unknown).

## Word Journal Panel

The `WordJournalPanel` component provides:

### Tabs

| Tab | Content |
|-----|---------|
| Journal | Scrollable word list with encounter counts and JLPT badges |
| Stats | Word counts by JLPT level, acquisition rate, bookmarked count |
| Cram | Flashcard review sessions |

### Filters

- **All**: Every word in the journal.
- **Acquired**: Words with 50+ encounters.
- **Learning**: Words with < 5 encounters.
- **Bookmarked**: User-flagged words.

### Sort Options

- **Recent**: By `lastSeen` (most recent first).
- **Frequent**: By `encounterCount` (highest first).
- **Level**: By JLPT level (N5 first).

### Search

Free-text filter matching word, reading, or meaning.

## Cram Sessions

`CramSession` provides flashcard-style review:

1. Words are filtered by `getWordsForCram(filter)` — only words with meanings are included.
2. Filter options: conversation ID, JLPT level, max encounters, bookmarked only.
3. Cards show the word; learner reveals the reading and meaning.
4. Tracks "known" vs "forgotten" within the session (session-only, not persisted).

## Storage Pruning

To manage localStorage size:
- Words with `encounterCount > 10` have their `conversationIds` trimmed to the last 3.
- This happens in `saveWordJournal()` on every write.

## Legacy SRS Migration

The original SRS system (`srs.ts`) used interval-based spaced repetition. `migration.ts` runs a one-time migration:
- Each `SRSCard` becomes a `WordJournalEntry`.
- `encounterCount` is set from `correctCount + incorrectCount`.
- The `nihongo-srs-migrated` flag prevents re-migration.

## Integration Points

- **TokenWord popover**: Shows reading, meaning, encounter count. "Bookmark" button adds to journal.
- **Profile rebuild**: `getJournalStats()` feeds word counts into the learner profile.
- **AI calibration**: `wordsToTeach` and `reinforcementWords` are computed from journal data and sent to Claude.
