# AI Integration

The nihongo subsystem uses Claude Opus 4.6 as a curriculum engine, not just a chatbot. Every AI call receives the learner's profile so responses are calibrated to their current level.

## Model

All endpoints use `claude-opus-4-6` via the `@anthropic-ai/sdk` package.

## AI Functions

### 1. Live Conversation (`/api/nihongo/converse`)

Claude role-plays a character in real-time. The system prompt establishes:
- Character identity (name, description, topic)
- Target JLPT level
- Serialized learner profile

**Prompt structure:**
```
System: Character instructions + rules + learner profile
Messages: Full conversation history replayed as user/assistant turns
  - Speaker messages → assistant role (as JSON)
  - Learner messages → user role (as plain text)
```

**Key constraints in the system prompt:**
- Always use kanji where a native speaker would
- Stay in character; don't correct learner errors in-character
- Quiz distractors must use vocabulary from the message
- `answerParts`: 4-8 meaningful phrase chunks
- Set `shouldEnd: true` after 4-6 natural exchanges

### 2. Conversation Generation (`/api/nihongo/generate`)

Claude acts as a curriculum designer, producing a complete `Conversation` object with 4-5 exchanges.

**Vocabulary calibration (when profile is available):**
- ~90% vocabulary the learner has already encountered
- ~10% new vocabulary from their next JLPT level
- Reuse reinforcement words naturally
- Scaffold specialized vocabulary with context clues

### 3. Answer Feedback (`/api/nihongo/feedback`)

Claude evaluates the learner's response for semantic validity (not exact match).

**Output constraints:**
- Warm, encouraging tone
- 2-3 sentences maximum
- Optional `grammarTip` when relevant

### 4. Grammar Breakdown (`/api/nihongo/grammar`)

Claude explains sentence structure part-by-part with roles, readings, and meanings.

## Learner Profile Serialization

`serializeProfileForPrompt()` in `db.ts` compresses the profile into ~200-400 tokens:

```
Level: N4 | Words: 342 (N5: 280/800, N4: 45/1500, N3: 12/3700, N2: 5/6000, N1: 0/10000)
Acquired (50+ encounters): 89 | Conversations: 23
Grammar seen: polite, past, negative, te-form, want to, ...
NEW GRAMMAR TO INTRODUCE (use 1-2 of these): passive, causative
NEW WORDS TO TEACH (weave 3-5 of these into the conversation): 予約, 届ける, ...
Reinforce (seen 2-4x, reuse naturally): 駅, 天気, 週末, ...
REVIEW (due for spaced review — weave these naturally): 食べる, 大切, 週末, ...
GRAMMAR REVIEW (due — use these patterns naturally): ので, ている, たい, ...
Recent topics: ordering food, asking directions, ...
DIFFICULTY: Learner is struggling (low quiz accuracy). Use simpler vocabulary...
```

The REVIEW and GRAMMAR REVIEW lines are populated by the hidden SRS system — items whose last encounter exceeds their stage-appropriate review interval (1 day for new items up to 30 days for acquired ones). See [Vocabulary System](./vocabulary-system.md) for details.

### Difficulty Note

Appended based on `mcAccuracy` (exponential moving average):
- `< 0.5`: "Learner is struggling. Use simpler vocabulary and shorter sentences. Prioritize reinforcement."
- `> 0.9`: "Learner is doing very well. Push slightly harder — more new vocabulary, complex grammar."
- Between 0.5-0.9: No note (neutral zone).

## Profile Rebuild Cycle

Before every AI call, `rebuildProfile()` is called to ensure the profile reflects the latest state:

1. Read word journal → compute `totalWords`, `wordsByLevel`, `acquiredWords`
2. Read grammar patterns → populate `grammarPatternsSeen`
3. Read conversation history → compute `conversationsCompleted`, `recentTopics`
4. Compute `reinforcementWords` (words seen 2-4x in last 5 conversations)
5. Estimate level from JLPT coverage thresholds
6. Compute `wordsToTeach` (8 unseen JLPT words at target level)
7. Compute `grammarToIntroduce` (3 new patterns at/below target level)

## Kanji Enforcement

A universal rule across all AI prompts: always use kanji where a native speaker would write kanji. The app provides readings on hover, so dumbing down to hiragana is counterproductive.

## Response Parsing

All AI responses are expected as raw JSON. A cleanup step strips markdown code fences if present:

```typescript
if (jsonStr.startsWith("```")) {
  jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
}
```
