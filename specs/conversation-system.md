# Conversation System

The conversation system is the core learning loop. There are three modes: scripted, AI-generated, and live.

## Conversation Modes

### Scripted Conversations

17 built-in conversations defined in `conversations.ts`. Each has a fixed set of exchanges with a speaker character, a topic, and a difficulty level. These serve as reliable baseline content.

### AI-Generated Conversations

Created via `/api/nihongo/generate`. The learner provides an optional topic; Claude produces a complete `Conversation` object. Generated conversations are stored in localStorage under `nihongo-ai-conversations` and appear alongside scripted ones in the selection screen.

### Live Conversations

Real-time back-and-forth with Claude via `/api/nihongo/converse`. The learner picks a topic and level, and Claude improvises as a character. Live mode differs from scripted/generated:
- No pre-defined exchanges; each turn is generated on-the-fly.
- Full conversation history is replayed to Claude for context continuity.
- Claude decides when to end the conversation (`shouldEnd: true`).
- A unique conversation ID (`live-{timestamp}`) is assigned for word journal tracking.

## Exchange Flow (Phase Machine)

Each exchange follows a fixed sequence of `GamePhase` transitions:

```
select → reading → quiz → quiz_result → mode_select → answering → answer_feedback → [next exchange or complete]
```

### Phase Details

| Phase | What happens |
|-------|-------------|
| `select` | Conversation list with level badges, completion checkmarks, replay buttons, and generate form |
| `reading` | Speaker's message appears as a chat bubble. Learner clicks to continue. |
| `quiz` | 4-choice comprehension question. Each choice has audio and an English translation toggle. |
| `quiz_result` | Shows correct/incorrect. If wrong, displays the correct answer. Records result via `recordMCResult()`. |
| `mode_select` | Learner picks answer mode: scramble, freetext, or hybrid. |
| `answering` | Learner constructs their response (see Answer Modes below). |
| `answer_feedback` | AI evaluates the answer. Shows feedback and optional grammar tip. |
| `complete` | Conversation finished. Stats summary, conversation saved for replay. |

### Answer Modes

| Mode | Description |
|------|-------------|
| `scramble` | `answerParts` are shuffled. Learner taps/drags chunks into correct order. |
| `freetext` | Learner types their response in Japanese directly. |
| `hybrid` | Toggle between scramble and freetext within the same exchange. |

## Message Display

Each message renders as a `MessageBubble` with:
- **TokenizedText**: Japanese text broken into hoverable tokens with readings and meanings.
- **Audio button**: TTS playback for the full message.
- **Translation toggle**: Show/hide English translation.
- **GrammarBreakdown**: Expandable AI grammar analysis (on demand).

## Conversation Selection Screen

The selection screen shows all conversations (scripted + AI-generated) as a messenger-style list:
- **Level badge**: Color-coded (green=beginner, amber=intermediate, rose=advanced).
- **Completion checkmark**: Shows if the conversation has been completed.
- **Replay button**: Available for saved conversations; enters read-only replay mode.
- **Generate form**: Topic input with "Live" and "Generate" buttons.

## Replay Mode

Completed conversations are saved to `nihongo-saved-conversations` with their full message history. Replay mode displays all messages in sequence without interaction phases — a read-only review of the conversation.

## Token Caching

Tokenization results are cached in component state (`tokenCache: Record<string, KuromojiToken[]>`) to avoid redundant API calls when the same text appears multiple times.

## Side Effects During Conversation

Each exchange triggers:
1. **Token recording**: `recordTokens()` writes every non-punctuation morpheme to the word journal.
2. **Grammar recording**: `recordGrammarPatterns()` extracts `grammar_note` values from tokens.
3. **MC result tracking**: `recordMCResult()` updates the rolling accuracy average.
4. **Conversation recording**: On completion, `recordConversation()` adds to history.
5. **Profile rebuild**: Before AI calls, `rebuildProfile()` refreshes recommendations.
