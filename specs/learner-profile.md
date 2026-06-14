# Learner Profile & Adaptive Difficulty

The learner profile is the bridge between the vocabulary/grammar tracking systems and AI content generation. It ensures every conversation is calibrated to the learner's current state.

## Profile Lifecycle

### Initialization

On first visit, `OnboardingFlow` presents JLPT level selection (N5–N1). `initProfile(level)` creates a fresh profile with:
- Chosen level as `estimatedLevel`
- `mcAccuracy: 1.0` (benefit of the doubt)
- Empty word/grammar/topic lists
- Current timestamp as `startedAt`

### Rebuilding

`rebuildProfile()` is called before every AI request. It reconstructs the profile from ground truth:

1. **Word stats** from journal: `totalWords`, `wordsByLevel`, `acquiredWords`.
2. **Grammar patterns** from pattern store: top 50 by frequency.
3. **History** from conversation records: `conversationsCompleted`, `recentTopics` (last 5).
4. **Reinforcement words**: words seen 2-4 times in the last 5 conversations (up to 20).
5. **Level estimation** from JLPT coverage (see below).
6. **Words to teach**: 8 unseen JLPT words at target + next level.
7. **Grammar to introduce**: 3 unseen patterns at/below target level.

The profile preserves `mcAccuracy`, `mcTotal`, and `startedAt` from the previous state.

## Level Estimation

Level is estimated from word coverage against JLPT targets:

| JLPT Level | Target Words | Coverage Threshold to Advance |
|-------------|-------------|------------------------------|
| N5 | 800 | > 50% → estimates N4 |
| N4 | 1,500 | > 50% → estimates N3 |
| N3 | 3,700 | > 50% → estimates N2 |
| N2 | 6,000 | > 50% → estimates N1 |
| N1 | 10,000 | — |

Level is checked top-down: if N2 coverage > 50%, level is N1 regardless of lower-level coverage.

## Adaptive Difficulty

### Quiz Accuracy Tracking

`recordMCResult(correct)` updates `mcAccuracy` using an exponential moving average:

```
mcAccuracy = mcAccuracy × (1 - α) + (correct ? 1 : 0) × α
```

Where `α = 0.1`. This smooths out individual mistakes while still being responsive to trends. Recent performance weighs more than old results.

### Difficulty Zones

After 5+ quiz questions, the profile includes a difficulty note in AI prompts:

| Accuracy Range | Behavior |
|---------------|----------|
| < 0.5 | **Struggle mode**: Simpler vocabulary, shorter sentences, prioritize reinforcement over new material |
| 0.5 – 0.9 | **Neutral**: Normal calibration, balanced mix of known and new |
| > 0.9 | **Mastery mode**: Push harder, more new vocabulary, more complex grammar |

### Vocabulary Scaffolding

`computeWordsToTeach(profile)`:
1. Gets JLPT words at the learner's target level and one level above.
2. Filters out words already in the journal.
3. Randomly selects 8 candidates.
4. These are included in the AI prompt: "weave 3-5 of these into the conversation."

### Grammar Scaffolding

`computeGrammarToIntroduce(profile)`:
1. Gets patterns at or below the target JLPT level that haven't been seen.
2. Also checks one level up for gentle pushing.
3. Selects up to 3 patterns.
4. Included in the AI prompt: "use 1-2 of these."

## Profile Serialization

`serializeProfileForPrompt(profile)` compresses the profile into ~200-300 tokens of plain text for Claude's system prompt. It includes:
- Level and word coverage per JLPT tier
- Acquired word count and conversation count
- Grammar patterns seen (up to 20)
- New grammar to introduce
- New words to teach
- Reinforcement words
- Recent topics
- Difficulty note (if applicable)

## User Controls

Via `ProfileDialog`:
- **View stats**: Current level, word counts, grammar coverage.
- **Override level**: Manually set estimated level (useful if auto-detection is wrong).
- **Reset profile**: Clears profile but keeps word journal; recalculates level from scratch.
- **Clear all data**: Wipes everything (profile, journal, patterns, history, saved conversations).
