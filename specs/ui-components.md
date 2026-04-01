# UI Components

## Component Hierarchy

```
page.tsx
└── Game                          # Root state machine
    ├── OnboardingFlow            # First-run only
    │
    ├── [phase: select]
    │   ├── Conversation List     # Inline in Game.tsx
    │   │   └── AudioButton      # Title audio
    │   └── Generate Form         # Topic + Live/Generate buttons
    │
    └── [phase: active conversation]
        ├── Header
        │   ├── AudioButton       # Title audio
        │   ├── Progress Bar      # Exchange progress
        │   └── Controls
        │       ├── Highlight Toggle (Palette icon)
        │       ├── Word Journal Toggle (BookOpen icon)
        │       └── Profile Button (Settings icon)
        │
        ├── Message Area
        │   └── MessageBubble (×N)
        │       ├── TokenizedText
        │       │   └── TokenWord (×N)
        │       │       └── Popover: reading, meaning, bookmark, audio
        │       ├── AudioButton
        │       ├── Translation Toggle
        │       └── GrammarBreakdown (expandable)
        │
        ├── Interaction Panel
        │   ├── [reading]         → Continue button
        │   ├── [quiz]            → MultipleChoice (4 buttons with audio + EN toggle)
        │   ├── [quiz_result]     → Correct/incorrect display
        │   ├── [mode_select]     → 3 mode buttons (Scramble/Freetext/Hybrid)
        │   ├── [answering]       → AnswerPanel
        │   ├── [answer_feedback] → Feedback text + grammar tip
        │   └── [complete]        → Completion screen
        │
        ├── WordJournalPanel (sidebar / mobile overlay)
        │   ├── Journal Tab       # Word list with filters and sort
        │   ├── Stats Tab         # JLPT breakdown, acquisition rate
        │   └── Cram Tab
        │       └── CramSession   # Flashcard review
        │
        └── ProfileDialog (modal)
```

## Key Components

### Game (`Game.tsx`)

The root component. Manages all state via `useState` hooks. ~1050 lines. Responsible for:
- Phase transitions
- API calls (generate, converse, feedback, tokenize)
- localStorage read/write
- Token caching
- Live mode state

### MessageBubble

Renders a chat-style message bubble. Speaker messages appear on the left; user messages on the right. Each bubble contains:
- Tokenized Japanese text with hover interactions
- Audio playback button
- Collapsible English translation
- Expandable grammar breakdown (fetched on demand)

### TokenizedText / TokenWord

`TokenizedText` renders an array of `KuromojiToken` as inline elements. Each `TokenWord` is a clickable span that opens a popover with:
- Hiragana reading
- English meaning (if available)
- Part of speech
- Encounter count
- Bookmark button
- Audio button
- External dictionary link (ichi.moe)

Grammar highlighting colors are applied based on `pos` and the current highlight level from `HighlightProvider`.

### MultipleChoice

4 color-coded buttons (blue, green, amber, rose). Each button shows:
- Japanese text
- AudioButton for pronunciation
- Toggle for English translation
- Correct/incorrect feedback state after selection

### AnswerPanel

Provides three input modes:
- **Scramble**: Shuffled `answerParts` displayed as tappable chips. Learner builds the sentence by selecting chips in order. Can deselect to rearrange.
- **Freetext**: Textarea for direct Japanese input.
- **Hybrid**: Toggle between scramble and freetext.

Submits to `/api/nihongo/feedback` for AI evaluation.

### WordJournalPanel

Collapsible sidebar (desktop) or full overlay (mobile). Three tabs: journal, stats, cram. See [Vocabulary System](./vocabulary-system.md) for details.

### CramSession

Flashcard review within the journal panel. Shows word → reveal reading + meaning. Tracks known/forgotten within the session. Filterable by JLPT level, conversation, bookmarks.

### OnboardingFlow

Shown on first visit when no profile exists. Presents 5 JLPT levels with descriptions. Selection calls `initProfile()` and transitions to the conversation list.

### ProfileDialog

Modal dialog showing:
- Current estimated level
- Word counts and JLPT coverage
- Level override control
- Reset profile / clear all data buttons

### SelectionToolbar

A floating toolbar component rendered at the page level (outside Game). Appears when the user selects any text on the page. Provides a "Listen" button for TTS playback of the selected text.

### GrammarBreakdown

Expandable section within a MessageBubble. Fetches grammar analysis from `/api/nihongo/grammar` on first expand. Displays parts with roles, readings, meanings, structural formula, and explanatory note.

## Styling

- **Tailwind CSS** throughout, no CSS modules.
- **Level colors**: Consistent color scheme across the app:
  - Beginner: emerald (green)
  - Intermediate: amber
  - Advanced: rose (pink/red)
- **Icons**: Lucide React icon library.
- **Responsive**: Sidebar becomes full overlay on mobile.
