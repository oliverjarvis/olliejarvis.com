# Nihongo Subsystem — Specification Index

An AI-powered Japanese language learning platform built on Next.js with Supabase backend. Learners practice through scripted, generated, and live conversations with adaptive difficulty, comprehensive vocabulary tracking, and 935-point grammar detection.

## Specs

| Spec | Description |
|------|-------------|
| [Architecture](./architecture.md) | Stack, directory layout, rendering model, data flow, environment |
| [Data Models](./data-models.md) | TypeScript interfaces, type aliases, Supabase schema |
| [API Routes](./api-routes.md) | All 8 backend endpoints: converse, generate, feedback, tokenize, tts, grammar, grammar-detect, lookup |
| [AI Integration](./ai-integration.md) | Claude usage, prompt design, learner profile serialization, difficulty calibration |
| [Conversation System](./conversation-system.md) | Three conversation modes, exchange phase machine, answer modes, replay, side effects |
| [Vocabulary System](./vocabulary-system.md) | Word journal, natural acquisition model, JLPT lookup, cram sessions, legacy SRS migration |
| [Grammar System](./grammar-system.md) | Two-stage grammar detection (935 points), morphological patterns, highlighting, AI breakdown |
| [Learner Profile](./learner-profile.md) | Profile lifecycle, level estimation, adaptive difficulty, vocabulary/grammar scaffolding |
| [Audio & TTS](./audio-tts.md) | Edge TTS, Web Speech fallback, caching strategy, UI integration points |
| [UI Components](./ui-components.md) | Component hierarchy, key component descriptions, styling conventions |
| [State Management](./state-management.md) | React state structure, persistence layer, data flow patterns, context providers |

## How to Use These Specs

**To understand the system**: Start with [Architecture](./architecture.md) for the big picture, then [Conversation System](./conversation-system.md) for the core learning loop.

**To add a new feature**: Check [Data Models](./data-models.md) for existing types, [State Management](./state-management.md) for where state lives, and [UI Components](./ui-components.md) for where to add UI.

**To modify AI behavior**: See [AI Integration](./ai-integration.md) for prompt design and [Learner Profile](./learner-profile.md) for how the profile drives content calibration.

**To extend vocabulary/grammar tracking**: See [Vocabulary System](./vocabulary-system.md) and [Grammar System](./grammar-system.md) for the acquisition model and pattern extraction pipeline.
