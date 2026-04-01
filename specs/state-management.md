# State Management

## Approach

All state lives in React hooks within `Game.tsx`. There is no global store (Redux, Zustand, etc.). The only React context is `HighlightProvider` for grammar highlight intensity.

## State Categories

### Conversation Flow

```typescript
phase: GamePhase              // Current UI phase
currentConv: Conversation     // Active conversation definition
exchangeIdx: number           // Current exchange index (0-based)
messages: DisplayMessage[]    // Chat history for display
```

### Quiz Interaction

```typescript
selectedChoice: number | null   // Which MC option was tapped
quizCorrect: boolean | null     // Whether the choice was correct
```

### Answer Input

```typescript
answerMode: AnswerMode | null   // scramble / freetext / hybrid
userAnswer: string              // Composed answer text
aiFeedback: { isValid, feedback, grammarTip } | null
isFeedbackLoading: boolean
```

### Live Conversation

```typescript
isLiveMode: boolean
liveConvId: string | null
liveSpeaker: string
liveSpeakerDesc: string
liveTopic: string
liveLevel: string
liveExchange: ConversationExchange | null
liveHistory: { role, text, translation }[]
isLiveLoading: boolean
liveEnded: boolean
```

### AI Generation

```typescript
aiConversations: Conversation[]   // All generated conversations
isGenerating: boolean
generateTopic: string
showGenerateForm: boolean
```

### Replay

```typescript
savedConversations: Record<string, SavedConversation>
replayId: string | null
```

### Caching

```typescript
tokenCache: Record<string, KuromojiToken[]>   // Text → tokens
```

### UI Toggles

```typescript
showJournal: boolean
showProfile: boolean
hasProfile: boolean
wordCount: number
journalRefresh: number          // Increment to trigger journal re-render
```

## Persistence Layer

State is persisted to `localStorage` at specific moments, not on every render:

| When | What is saved |
|------|---------------|
| Profile rebuild | `nihongo-learner-profile` |
| Token recording | `nihongo-word-journal` |
| Grammar recording | `nihongo-grammar-patterns` |
| Conversation completion | `nihongo-conversation-history`, `nihongo-saved-conversations` |
| AI generation | `nihongo-ai-conversations` |

## Initialization

On mount (`useEffect` with empty deps):
1. Run SRS → Word Journal migration.
2. Load saved conversations from localStorage.
3. Load AI-generated conversations from localStorage.
4. Compute word count from journal stats.
5. Check if a learner profile exists.

## Context Providers

### HighlightProvider

```typescript
// highlight-context.tsx
{
  level: "off" | "subtle" | "vivid"
  cycle: () => void              // Rotates: off → subtle → vivid → off
}
```

Wraps the nihongo page. Consumed by `TokenWord` for grammar color-coding.

## Refs

```typescript
messagesEndRef: HTMLDivElement    // Auto-scroll target
interactionRef: HTMLDivElement    // Scroll interaction panel into view
```

## Data Flow Patterns

### Phase Transition

```
User action (click, submit)
  → setPhase(nextPhase)
  → Conditional side effects (API calls, recording)
  → State updates from API response
  → Re-render with new phase
```

### Token Caching

```
Text needs tokenization
  → Check tokenCache[text]
    → Hit: use cached tokens
    → Miss: fetch /api/nihongo/tokenize
      → Store result in tokenCache
      → Call recordTokens() → updates word journal
      → Call recordGrammarPatterns() → updates grammar store
```

### Live Conversation Turn

```
User submits answer
  → setIsLiveLoading(true)
  → Add user message to messages + liveHistory
  → fetch /api/nihongo/converse with full history
  → Receive exchange
  → setLiveExchange(exchange)
  → Add speaker message to messages + liveHistory
  → Tokenize speaker message
  → Transition to quiz phase
  → If shouldEnd: setLiveEnded(true)
```
