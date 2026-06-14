# Jetlag

Real-time, no-auth group chat with importable lists, dice rolls, media sharing,
and random team generation. Backend is [Convex](https://convex.dev); the UI lives
under `/jetlag`.

## Features

- **Real-time multi-thread chat** with live typing indicators (Convex reactive
  queries — no websockets to wire up).
- **Anonymous identity**: on first visit a uuid is generated and stored in
  `localStorage`; the user is asked for a display name, persisted in Convex.
  Anyone can post in any thread.
- **Media sharing**: images and video upload to Convex file storage and render
  inline.
- **Lists** (`/jetlag/lists`): create lists and bulk-import items from Excel
  (`.xlsx`). First column is the item text; extra columns are kept as metadata.
- **Dice roll**: in any thread, roll a die (e.g. 1–20) against a list — a random
  item is served into the chat as a system message.
- **Teams** (`/jetlag/teams`): randomly split people into teams of configurable
  sizes; each team gets its own chat thread.

## Running locally

Convex runs as a **local anonymous deployment** (no cloud account required).

```bash
# 1. start the Convex backend (also generates convex/_generated and writes
#    NEXT_PUBLIC_CONVEX_URL into .env.local). Leave this running.
npx convex dev

# 2. in another terminal, start Next.js
pnpm dev
```

Then open http://localhost:3000/jetlag.

If `NEXT_PUBLIC_CONVEX_URL` is missing the page shows a hint to run
`npx convex dev`.

## Tests

Backend functions are covered by [`convex-test`](https://docs.convex.dev/testing/convex-test)
under vitest:

```bash
pnpm test
```

## Layout

```
convex/                 # backend (schema + functions), shared by the whole app
  schema.ts             # tables: users, threads, messages, typing, lists, listItems, teams, teamMembers
  users.ts threads.ts messages.ts typing.ts lists.ts teams.ts
  *.test.ts             # convex-test suites
src/app/jetlag/
  layout.tsx            # ConvexClientProvider + IdentityProvider + nav
  ConvexClientProvider.tsx
  IdentityProvider.tsx  # uuid + name gate, exposes useIdentity()
  JetlagNav.tsx
  page.tsx + components/        # chat / conversation view
  lists/                # list management + Excel import
  teams/                # random team generation
```
