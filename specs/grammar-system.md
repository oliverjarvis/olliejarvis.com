# Grammar System

Grammar operates at three levels: morphological pattern extraction (automatic), grammar point detection (two-stage AI-assisted), and on-demand grammar breakdown.

## 1. Morphological Pattern Extraction (Legacy)

The original system extracts conjugation patterns from Kuromoji tokens. Still active — feeds into the learner profile for AI prompt calibration.

### Token Merging

The `/api/nihongo/tokenize` endpoint merges auxiliary and dependent morphemes into the preceding token, then labels the result with grammar notes.

**Merge rules** — a token is merged when:
- It is an auxiliary verb (助動詞)
- It is a conjunctive particle (助詞/接続助詞)
- It is a non-independent verb (動詞/非自立) or adjective (形容詞/非自立)

**Example:** `行きました` → merged token with `grammar_note: "polite, past"`

### Grammar Note Labels

| Category | Examples |
|----------|----------|
| Auxiliary verbs | ます→polite, た→past, ない→negative, たい→want to, です→copula (polite) |
| Non-independent verbs | いる→~ing (ongoing), しまう→end up ~ing, おく→do ~ in advance |
| Particles | て→te-form |
| Non-independent adjectives | ない→negative, ほしい→want someone to ~ |

### Pattern Recording

`dbRecordGrammarPatterns(tokens)` in `db.ts` scans tokens for `grammar_note` fields, splits comma-separated notes, and increments encounter counts per pattern. Stored in `grammar_patterns` JSONB column.

---

## 2. Grammar Point Detection (Two-Stage)

The comprehensive grammar tracking system covers 935 grammar points sourced from BunPro (N5–N1 + non-JLPT), stored in `scrape_data/`. Each grammar point has structured data: name, meaning, JLPT level, usage patterns, and example sentences.

### Data Pipeline

```
scrape_data/*.md (936 files)
  → scripts/parse-grammar.mjs (parser + validator)
  → src/app/nihongo/data/grammar-points-db.ts (935 grammar points)
```

### Generated Database

`grammar-points-db.ts` exports:
- `GRAMMAR_POINTS: GrammarPointDef[]` — all 935 grammar points with detection markers
- `MARKER_TO_IDS: Record<string, number[]>` — marker string → grammar point IDs
- `GP_BY_ID: Record<number, GrammarPointDef>` — ID lookup

```typescript
interface GrammarPointDef {
  id: number;         // Lesson number from source files
  name: string;       // Japanese grammar form (e.g., "ので", "たい", "べき")
  meaning: string;    // English meaning
  jlptLevel: number;  // 5=N5, 4=N4, 3=N3, 2=N2, 1=N1, 0=non-JLPT
  markers: string[];  // Japanese forms for candidate filtering
}
```

**JLPT distribution:** N5: 126, N4: 177, N3: 218, N2: 217, N1: 184, Non-JLPT: 13

### Stage 1: Candidate Filter

`findCandidates(text, tokens)` in `grammar-detection.ts`. Fast, runs client-side.

**Strategy:**
1. Build lookup sets from token `basic_form` and `surface_form` values
2. For each grammar point's markers:
   - Single-character markers: require token form match (avoids substring false positives)
   - Multi-character markers: check text substring OR token form match
3. Add morphological candidates based on token POS:
   - い-adjectives (pos=形容詞) → grammar points about い-adj usage
   - な-adjectives (pos=形容動詞) → grammar points about な-adj usage
   - Passive/potential verbs (basic_form=れる/られる)
   - Causative verbs (basic_form=せる/させる)
   - te-form (grammar_note contains "te-form")

**Coverage:** 91% of grammar points validated against their own example sentences. The remaining 9% (morphological patterns, compound expressions with separated parts) are caught by Stage 2.

**Output:** ~30-50 candidate grammar points per sentence.

### Stage 2: LLM Confirmation

`POST /api/nihongo/grammar-detect` — sends only the candidates (not all 935) to Claude Sonnet for confirmation.

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

**Model:** Claude Sonnet (fast, cheap). Max 200 tokens response.

**Prompt rules:**
- Only confirm if the sentence genuinely demonstrates the grammatical pattern
- A word merely appearing is not enough — the pattern must be present
- Particles must be in their grammatical function
- Compound expressions must have the full pattern present

### Detection Flow

```
Text tokenized (Kuromoji)
  → findCandidates(text, tokens) → ~30-50 candidates (client-side, instant)
  → POST /api/nihongo/grammar-detect → confirmed IDs (server-side, ~1s)
  → dbRecordGrammarPointIds(ids, conversationId) → Supabase
```

Detection runs in the background after tokenization — does not block the conversation UI.

### Grammar Points Journal

Stored in `grammar_points_journal` JSONB column in `user_data` table.

```typescript
interface GrammarPointJournalEntry {
  id: number;
  name: string;
  meaning: string;
  jlptLevel: number;
  encounterCount: number;
  conversationIds: string[];
  firstSeen: number;
  lastSeen: number;
  naturallyAcquired: boolean; // encounterCount >= 50
  bookmarked: boolean;
}
```

**Pruning:** `conversationIds` trimmed to last 3 for entries with 10+ encounters.

### Validation Approach

The parser script (`scripts/parse-grammar.mjs`) validates the candidate filter against example sentences from the source files:
1. Each grammar file contains 10-12 example sentences where the grammar point is guaranteed present
2. The validator checks if any marker would match those examples via text substring search
3. Grammar points whose markers don't match their own examples are reported as gaps
4. Gaps are covered by Stage 2 (LLM) or by POS-based morphological matching

---

## 3. Grammar Highlighting

The `HighlightProvider` context controls color-coded grammar visualization on tokenized text.

| Level | Behavior |
|-------|----------|
| off | No highlighting |
| subtle | Muted background colors by part of speech |
| vivid | Saturated colors by part of speech |

**Color mapping:** Nouns→blue, Verbs→green, Adjectives→amber, Particles→gray.

Cycled via palette button in the conversation header.

---

## 4. AI Grammar Breakdown

`POST /api/nihongo/grammar` provides on-demand sentence analysis. Triggered by expanding the `GrammarBreakdown` component on any message bubble. Returns part-by-part breakdown with roles, readings, meanings, and structural notes.

---

## UI Integration

### WordJournalPanel — Grammar Tab
- Dedicated "Grammar" tab alongside Words, Stats, Cram
- Searchable, filterable (all/learning/acquired), sortable (recent/frequent/level)
- Each entry shows: grammar point name, English meaning, encounter count, JLPT badge
- Acquired indicator: stage-colored dot (gray→sky→amber→emerald→solid emerald at 50+)

### Stats Tab
- **Vocabulary Coverage**: JLPT N5–N1 progress bars (words seen vs targets)
- **Grammar Coverage**: JLPT N5–N1 progress bars (grammar points seen vs totals per level)
- **Conjugation Patterns**: morphological patterns from the legacy system
- **Acquisition**: combined word + grammar learning/acquired counts

### ProfileDialog
- JLPT Grammar Coverage section with progress bars per level
- Shows total grammar points seen

### Header Badge
- Combined word + grammar count displayed in the Journal button
