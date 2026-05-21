# Phase 3 — Convex backend + online multiplayer

**Status:** scaffolded 2026-05-20. Code in `apps/convex/` and
`apps/web/src/ui/online/`. Awaiting one-time `pnpm --filter convex dev`
to provision a deployment — see `apps/convex/SETUP.md` for the runbook.
**Predecessor:** Phase 2 (solo-vs-AI) is shipped and playable locally.
**Author:** Opus 4.7 + Joel, 2026-05-20.

## Delta from the original plan (open questions resolved)

- **Auth:** swapped magic-link to **anonymous device-based identity**
  (localStorage UUID + freeform display name). No Resend dependency.
  Real auth lands in Phase 4 when collections need cross-device
  persistence. Schema reflects this: no `email`/`username` fields, no
  `friendships` table.
- **Friend invites:** deferred to Phase 3.5. Ship with room code +
  share link only.
- **Chat:** deferred.
- **Steal audit retention:** 48h via `cleanupStealAudit` scheduled
  function (self-reschedules every hour).
- **Convex deployment:** scaffolded but not provisioned — `convex dev`
  needs interactive OAuth which can't be done headlessly. Documented in
  `apps/convex/SETUP.md`.

This document is written so any competent coding agent (including
ollama at ~90% accuracy) can execute each section without needing
Opus-tier judgment to fill gaps. Every brief lists: exact file path,
exact imports, exact type signatures, exact string literals, one
canonical algorithm, and a passing-test acceptance criterion.

---

## 0. Exit criteria

Phase 3 is **done** when *all* of the following hold:

1. Two phones on different networks can complete a 4-player match
   together (with up to two AI fill-ins) including:
   - 6-6 opener resolution
   - At least one round-end (domino, capicúa, or tranca)
   - At least one match-end
2. One player can intentionally disconnect mid-turn, reconnect within
   60s, and the match resumes seamlessly on their device.
3. The same player can leave the tab closed for >60s; the server
   auto-passes their turn. After three auto-passes their seat is
   handed to an AI fill-in (or the match ends if no fill-in option
   exists in friend mode).
4. DevTools "WebSocket" / Convex sub payload audit: every subscribed
   client sees **only their own hand**. Opponent hands appear only as
   tile counts. Steal events show only the tile the local player
   received.
5. Engine logic remains shared: `apps/web/src/engine/*.ts` is the
   single source of truth, imported by both the React client AND the
   Convex server functions.
6. Vitest suite still 58/58 passing. Engine coverage still ≥95% stmts.
7. New integration tests cover at least: server-side `playTile`
   mutation with valid + invalid moves, server-side `resolveSteal`
   determinism with a fixed seed, reconnection grace.

---

## 1. Architecture decisions (locked)

- **Server authority.** The Convex DB holds the canonical `GameState`.
  Clients receive *only what their player is allowed to see*: own hand,
  public chain, opponent hand sizes, scores, history of moves +
  steal-event metadata (without the source player's hand contents).

- **Engine is shared, not duplicated.** `apps/web/src/engine/` is the
  source of truth. The Convex package imports from it via a TypeScript
  path alias (`@engine/*`) configured in:
  - `apps/web/tsconfig.json` → already strict; adds path entry
  - `apps/convex/tsconfig.json` → new file; same path entry
  - `pnpm-workspace.yaml` → already includes `apps/*`

  **Implementation note:** Convex bundles its functions with esbuild;
  it follows TS path mappings from `apps/convex/tsconfig.json`. Verify
  with a 1-line test mutation that imports `validMoves` and returns
  its length before building the rest.

- **Steal RNG runs server-side, audit-logged.** Server uses
  `crypto.getRandomValues` for prod (via the existing `cryptoRng()` in
  `apps/web/src/engine/setup.ts`) and `seededRng(seed)` for tests.
  Each steal writes a row to `stealAudit` with `{gameId, turnNumber,
  seed, sourcePlayerId, stolenTile}` — 48h retention.

- **Reconnection model.** Convex's reactive subscriptions
  automatically reconnect. The grace timer is server-side: a per-seat
  `lastSeenAt` field, polled by a scheduled function that auto-passes
  if `now - lastSeenAt > 60_000` AND it's that seat's turn.

- **Auth: magic-link only for v1.** `@convex-dev/auth` magic link
  + email. Adds username + avatar on first login. Sign-in-with-Apple
  / Google deferred. Username is unique, lowercase, kebab/underscore
  only; display name is freeform.

- **No public matchmaking.** Friend-list or share-link only. Per
  `IDEAS.md` `[parked]` entry; do not unpark in Phase 3.

- **No chat in v1.** Add in Phase 3.5 if friend playtests demand it.
  Reduces scope + abuse surface.

---

## 2. Convex schema

**File:** `apps/convex/schema.ts` (new file).

**Tables required.** Each entry below is the exact `defineTable` block
the agent should produce. Indexes are listed inline.

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    username: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"]),

  friendships: defineTable({
    userIdA: v.id("users"),
    userIdB: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("blocked")),
    requestedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_user_pair", ["userIdA", "userIdB"])
    .index("by_userIdA", ["userIdA"])
    .index("by_userIdB", ["userIdB"]),

  games: defineTable({
    roomCode: v.string(), // 6-char A-Z0-9
    hostUserId: v.id("users"),
    mode: v.union(v.literal("4p-partners"), v.literal("2p"), v.literal("solo-vs-ai")),
    phase: v.union(
      v.literal("lobby"),
      v.literal("in_round"),
      v.literal("round_end"),
      v.literal("match_end"),
      v.literal("abandoned"),
    ),
    // Public game-state fields (replicate engine.GameState minus hands)
    chain: v.any(), // engine.Chain serialized
    turnIndex: v.number(),
    turnNumber: v.number(),
    round: v.number(),
    scores: v.object({ A: v.number(), B: v.number() }),
    options: v.object({
      targetScore: v.union(v.literal(100), v.literal(150), v.literal(200)),
      capicuaBonus: v.number(),
      chuchazoBonus: v.number(),
      mode: v.string(),
    }),
    lastActorUserId: v.optional(v.id("users")),
    lastOutcome: v.any(), // engine.RoundOutcome | null serialized
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_roomCode", ["roomCode"])
    .index("by_host", ["hostUserId"]),

  seats: defineTable({
    gameId: v.id("games"),
    position: v.union(v.literal(0), v.literal(1), v.literal(2), v.literal(3)),
    userId: v.optional(v.id("users")), // null if AI fill-in
    team: v.union(v.literal("A"), v.literal("B")),
    isAI: v.boolean(),
    displayName: v.string(),
    lastSeenAt: v.number(),
    autoPassCount: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_position", ["gameId", "position"])
    .index("by_user", ["userId"]),

  playerHands: defineTable({
    // PRIVATE — never exposed to other players.
    gameId: v.id("games"),
    seatPosition: v.union(v.literal(0), v.literal(1), v.literal(2), v.literal(3)),
    userId: v.optional(v.id("users")),
    tiles: v.array(v.array(v.number())), // Tile[] serialized as [a,b] pairs
  }).index("by_game_seat", ["gameId", "seatPosition"]),

  history: defineTable({
    gameId: v.id("games"),
    turnNumber: v.number(),
    entry: v.any(), // engine.HistoryEntry serialized (Move | StealEvent | StealSkipped)
    createdAt: v.number(),
  }).index("by_game", ["gameId"]),

  stealAudit: defineTable({
    // 48h retention — see scheduled cleanup function.
    gameId: v.id("games"),
    turnNumber: v.number(),
    sourceSeatPosition: v.number(),
    targetSeatPosition: v.number(),
    stolenTile: v.array(v.number()),
    rngSeed: v.number(),
    createdAt: v.number(),
  }).index("by_game", ["gameId"]),
});
```

**Acceptance:** `pnpm dlx convex@latest dev` runs without schema errors;
every table can be queried by its primary index from the Convex
dashboard.

---

## 3. Server API (mutations + queries)

**Folder:** `apps/convex/`. Each file below is one Convex module.

For every mutation: the brief MUST include the file's imports, the
function's exact `args` signature (using `v.*`), the return type, the
validation order, and the engine call(s) to apply.

### 3.1 `apps/convex/auth.ts`

Standard `@convex-dev/auth` setup with magic-link provider. Generate
this from the library's documented bootstrap (the agent should fetch
docs via `mcp__plugin_context7_context7__query-docs` for `convex-dev/auth`
if unsure). Do not hand-write the auth state machine.

**Exports:** `auth`, `signIn`, `signOut`, `store` (the standard convex
auth helpers).

### 3.2 `apps/convex/users.ts`

- `getMe(): User | null` — returns the calling user's profile or null.
- `setUsername({ username, displayName, avatarUrl? }): void` —
  first-time profile setup. Validates username uniqueness via the
  `by_username` index. Lowercase only `[a-z0-9_-]{3,20}`.

### 3.3 `apps/convex/lobbies.ts`

- `createGame({ mode: GameMode }): { gameId, roomCode }` — generates a
  unique 6-char `[A-Z0-9]` room code, creates the `games` row in
  `phase: "lobby"`, inserts the host's seat at position 0, sets host's
  team to "A".
- `joinByCode({ roomCode }): { gameId, position }` — finds the open
  game, places the joiner at the next empty seat position (0..3),
  alternates team A/B.
- `addAiSeat({ gameId, position }): void` — host-only. Creates an AI
  seat at the requested position.
- `startMatch({ gameId }): void` — host-only. Requires 2 or 4 filled
  seats (depending on mode). Deals the first round (server-side
  `dealRound` from the shared engine, using `cryptoRng`). Sets
  `phase: "in_round"`. Writes `playerHands` rows. Sets `turnIndex` to
  the holder of 6-6.

### 3.4 `apps/convex/games.ts`

This is the hot-path module. Each mutation runs *engine logic
server-side*, using the shared engine code.

- `playTile({ gameId, tile, side }): void`
  1. Auth-check: caller must own a seat in this game.
  2. Load full server-side `GameState` (assemble from `games` + `seats`
     + `playerHands` + `history`).
  3. Call `validMoves(state, callerPlayerId)`. If the requested move
     isn't in the list, throw `ConvexError("Illegal move")`.
  4. Call `applyMove(state, move)`. Patch `games` + `playerHands`
     + `history` accordingly.
  5. Call `resolveStealPhase(stateAfter, cryptoRng())`. Audit-log the
     steal (or skip-event) into `stealAudit`. Patch DB.
  6. Call `isRoundOver(stateFinal)`. If true: `computeRoundOutcome`,
     `applyRoundOutcome`, transition `phase` to `round_end` or
     `match_end`. Else: bump `lastSeenAt` for the new turn's seat.
  7. If next seat is AI, schedule an immediate `aiAdvance` invocation.

- `passTurn({ gameId }): void` — same shape as `playTile` but with a
  `PassMove`.

- `aiAdvance({ gameId }): void` — internal mutation, only called by
  the server's scheduler. Loads state, calls `chooseAiMove`, then runs
  the same playTile/passTurn pipeline.

- `startNextRound({ gameId }): void` — host-only. Allowed only when
  `phase === "round_end"`. Deals new round via shared `dealRound`,
  identifying the next opener from `lastOutcome.winningTeam`.

- `leaveGame({ gameId }): void` — caller's seat becomes AI fill-in,
  match continues.

### 3.5 `apps/convex/heartbeat.ts`

- `pingSeat({ gameId }): void` — called by the client every 15s while
  the tab is open. Updates `seats.lastSeenAt`.

- `enforceAutoPass`: scheduled function (every 15s) that scans active
  games for seats where `now - lastSeenAt > 60_000 && it's their turn`.
  Performs an auto-pass via the same `passTurn` path; increments
  `autoPassCount`. After 3 consecutive auto-passes, swap the seat to
  an AI fill-in.

### 3.6 `apps/convex/views.ts`

All read-side queries are here. **None of them ever return another
player's hand contents.**

- `myGameView({ gameId }): GameClientView` — returns:
  - public game fields (chain, scores, phase, etc.)
  - the caller's own hand (full content)
  - opponent hand tile *counts* only
  - history filtered: full `play`/`pass` entries, `steal` entries with
    `stolenTile` masked to `null` if neither source nor target is the
    caller, and `steal-skipped` always visible (no sensitive data)
- `listMyGames(): GameSummary[]` — games the caller is seated in.
- `friendList(): User[]`

### 3.7 `apps/convex/friends.ts`

- `addFriend({ usernameOrEmail }): void`
- `acceptFriend({ friendshipId }): void`
- `removeFriend({ friendshipId }): void`

---

## 4. Engine sharing

**Goal:** the Convex package imports `validMoves`, `applyMove`,
`resolveStealPhase`, `computeRoundOutcome`, etc. from
`apps/web/src/engine/` WITHOUT duplicating the code.

**Approach:** TypeScript path alias + workspace import.

1. Add to root `pnpm-workspace.yaml` if not already present:
   ```yaml
   packages:
     - apps/*
   ```
2. Add new `apps/convex/package.json`:
   ```json
   {
     "name": "@dominocontranpas/convex",
     "private": true,
     "version": "0.0.0",
     "type": "module",
     "scripts": { "dev": "convex dev" },
     "dependencies": {
       "convex": "^1.x",
       "@convex-dev/auth": "^0.x",
       "@dominocontranpas/web": "workspace:*"
     }
   }
   ```
3. Add `apps/convex/tsconfig.json` mirroring `apps/web/tsconfig.json`
   minus the React-specific bits, plus path alias:
   ```jsonc
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "Bundler",
       "lib": ["ES2022"],
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "exactOptionalPropertyTypes": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": true,
       "paths": {
         "@engine/*": ["../web/src/engine/*"]
       }
     },
     "include": ["./**/*"]
   }
   ```
4. Imports from convex files look like:
   ```ts
   import { applyMove, validMoves } from "@engine/moves.js";
   ```

**Validation step:** before any server logic is written, scaffold a
single `apps/convex/health.ts` mutation that imports `validMoves` and
returns `true`. Run `pnpm --filter convex dev` and verify Convex
bundles it without errors. If this fails, the path alias is wrong;
fix it BEFORE writing more code.

---

## 5. Web integration changes

Files in `apps/web/` that change. None of these require deleting
existing solo-vs-AI code — solo mode keeps working with the local
store; multiplayer adds a parallel path.

### 5.1 `apps/web/src/net/convexClient.ts` (new)

Standard `ConvexReactClient` initialization. Reads
`VITE_CONVEX_URL` from env. Exports `convex` client.

### 5.2 `apps/web/src/net/useGameSubscription.ts` (new)

Hook that subscribes to `views.myGameView` for the active gameId,
returns a `{ state: GameState | null, isLoading: boolean }`.

### 5.3 `apps/web/src/state/onlineGameStore.ts` (new)

A second Zustand store for online mode. Same shape as `gameStore` but
actions call Convex mutations instead of running engine logic locally.
Local optimistic updates are OK as long as the server's reactive
update will overwrite within ~50ms.

### 5.4 `apps/web/src/ui/MainMenu.tsx`

Enable the "Online with friends" button. On click → navigate to a
lobby screen.

### 5.5 New screens

- `apps/web/src/ui/lobby/CreateGame.tsx` — host: pick mode, click
  Create, see room code + share link, see filling seats live.
- `apps/web/src/ui/lobby/JoinGame.tsx` — paste room code or follow
  deep link; pick username if first-time.
- `apps/web/src/ui/lobby/SeatPicker.tsx` — pre-game lobby; shows the 4
  positions, lets the host add AI fill-ins, lets the host start.

### 5.6 `apps/web/src/App.tsx`

Add screen routes: `"menu" | "playing-local" | "playing-online" |
"lobby-create" | "lobby-join" | "round_end" | "match_end"`.

### 5.7 `apps/web/.env.local.example` (new, gitignored)

```
VITE_CONVEX_URL=https://your-convex-deployment.convex.cloud
```

---

## 6. Auth flow (minimal v1)

1. User clicks "Online with friends" on MainMenu.
2. If not signed in: magic-link email form. Submits to
   `auth.signIn({ provider: "resend", email })`.
3. Magic link clicked → arrives back at the app authenticated.
4. If `getMe()` has no `username`: show `SetUsername` screen forcing
   username + display name.
5. After username set: navigate to lobby chooser (Create / Join /
   Friend invites).

---

## 7. Reconnection mechanics

- Client calls `pingSeat({ gameId })` every 15s while game is active
  and the seat is mine. Uses `setInterval` with cleanup on unmount.
- Server's `enforceAutoPass` scheduled function runs every 15s.
- On reconnect within the 60s grace, the client's reactive subscription
  re-syncs automatically — no special handling needed.
- After 3 consecutive auto-passes (sequential, no successful play
  between), set `seats.isAI = true` and mark `userId` as null. The AI
  takes over from the next turn.
- If 4 sequential auto-passes happen across the table (everyone has
  abandoned), set `games.phase = "abandoned"`.

---

## 8. Lobby flow

**Room code shape:** 6 chars from alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
(skip ambiguous: 0/O, 1/I/L). Generated by random pick + uniqueness
check in `lobbies.createGame`.

**Share link:** `https://<app-url>/join/<roomCode>` — opens
`JoinGame.tsx` with the code pre-filled. Falls back to manual entry
if deep linking fails.

**Friend invites:** `friendList()` query → tap a friend → calls
`lobbies.inviteFriend({ gameId, friendUserId })` which writes a
`gameInvites` table row (NEW table — add to schema). The friend sees
the invite in a top-bar inbox.

(If friend invites add too much scope, ship Phase 3 with room-code +
share-link only and defer friend-invites to Phase 3.5.)

---

## 9. Anti-cheat verification

This is the load-bearing test of the whole phase. Add a Playwright
spec that:

1. Opens two browser contexts (two phones).
2. Both sign in as different users.
3. Player A hosts a game, picks "4p partners + 2 AI", Player B joins.
4. Once in `playing-online`, the test:
   - Opens DevTools (via playwright `route` interception) on player A's
     context.
   - Logs every WebSocket payload from Convex.
   - Plays a full round.
5. Assertions:
   - Player A's payloads NEVER contain player B's hand contents.
   - Player A's payloads SOMETIMES contain steal events; when the
     steal's source or target is player A, `stolenTile` is populated;
     otherwise it's `null`.
   - Player A's `playerHands` table reads return ONLY player A's hand.

Write this as `apps/web/e2e/anti-cheat.spec.ts`. If it passes once
locally, it's the ratchet that keeps anyone from accidentally
weakening the server-authority invariant in future PRs.

---

## 10. Brief breakdown (ollama-routable chunks)

Each chunk below is sized for ONE ollama dispatch following the
discipline in `feedback_ollama_90_95_accuracy_bar.md`. Briefs should
include the literal `apps/convex/schema.ts` content from §2 etc. as
imports/types when relevant.

| # | Chunk | Estimated brief words | Risk |
|---|---|---|---|
| 1 | `apps/convex/schema.ts` from §2 | ~400 | Low — schema is data |
| 2 | `apps/convex/tsconfig.json` + path alias setup | ~150 | Low |
| 3 | `apps/convex/health.ts` mutation that imports engine | ~120 | Low (validation step) |
| 4 | `apps/convex/users.ts` — getMe + setUsername | ~250 | Low |
| 5 | `apps/convex/lobbies.ts` — create/join/addAi/start | ~600 | **Medium** — multi-mutation, server-side dealRound integration |
| 6 | `apps/convex/games.ts::playTile` + `passTurn` | ~800 | **High** — hot path, anti-cheat critical. Opus reviews before commit. |
| 7 | `apps/convex/games.ts::aiAdvance` + `startNextRound` | ~400 | Medium |
| 8 | `apps/convex/heartbeat.ts` + scheduled function | ~400 | Medium — scheduled function timing |
| 9 | `apps/convex/views.ts::myGameView` | ~500 | **High** — view-layer is the anti-cheat surface; must mask other players' hands |
| 10 | `apps/convex/friends.ts` | ~250 | Low |
| 11 | `apps/web/src/net/convexClient.ts` + `useGameSubscription.ts` | ~250 | Low |
| 12 | `apps/web/src/state/onlineGameStore.ts` | ~400 | Medium |
| 13 | Lobby screens (CreateGame, JoinGame, SeatPicker) | ~600 | Low (UI) |
| 14 | Anti-cheat Playwright spec | ~400 | Medium — Playwright nuance |

Chunks marked **High** get an Opus review pass before commit (read
the resulting file and either approve or `Edit` the specific bugs).
The other chunks ship from ollama as-is unless typecheck/test fails.

---

## 11. Open questions / decisions to confirm before execution

These don't block planning but should be answered before chunks 5+
are dispatched.

1. **Convex deployment.** Free-tier deployment URL — do you create
   the project now or after the schema is final? Recommend: create
   now (free, gives a URL the env file can target).
2. **Magic-link provider.** `@convex-dev/auth` supports Resend out of
   the box. Joel needs a Resend API key (free tier 100 emails/day) OR
   we switch to OAuth providers. Resend is simpler for v1.
3. **Friend invites in scope?** §8 suggests deferring to 3.5 to keep
   Phase 3 tight. Default: **defer**, ship with room-code + share-link
   only.
4. **Chat in scope?** Per §1: **no**, defer.
5. **AI fill-in after disconnect: same heuristic AI as Phase 2?** Yes
   — reuse `chooseAiMove`. No change needed.
6. **Push notifications.** Listed as Phase 5 work. Not in this phase
   unless the friend playtests demand "your turn" alerts now.
7. **Anti-cheat audit: 48h retention enough?** Pick a number Joel is
   comfortable with for dispute resolution.

---

## 12. Risk list

1. **Engine-sharing path alias may break Convex's bundler.** Convex
   uses esbuild under the hood and respects most TS path mappings,
   but there are known edge cases with `paths` + workspace imports.
   Validation in §4 catches this early.
2. **Engine's `cryptoRng` uses `crypto.getRandomValues`.** Node 18+
   exposes this globally via `globalThis.crypto`. Convex runtime
   should support it. If not, swap to `node:crypto`'s `webcrypto`.
3. **Reactive subscriptions may include fields you forgot to gate.**
   The view filtering in §3.6 is the only thing between hand secrecy
   and a leak. Test it explicitly (§9).
4. **Race conditions on `playTile`.** Convex mutations are
   serializable per document, so two clients can't both apply moves
   simultaneously. But verify: when AI advance is scheduled
   immediately after a play, the schedule itself shouldn't run before
   the original mutation commits. Use Convex `ctx.scheduler.runAfter`
   correctly.
5. **Lobby seat selection race.** Two joiners hitting `joinByCode`
   simultaneously could collide on position. Use a Convex transaction
   pattern (one mutation reads-and-writes atomically).

---

## 13. Order of execution

A reasonable sequence once Joel green-lights:

1. Path alias setup + `health.ts` validation (§4). MUST pass before
   anything else.
2. `schema.ts` (§2). Run `convex dev`, verify dashboard.
3. `auth.ts` + `users.ts` (§3.1, §3.2). Magic-link smoke test.
4. `lobbies.ts` (§3.3). Manually create + join from two browser tabs.
5. `games.ts::playTile` + `passTurn` (§3.4). **Opus review.**
6. `views.ts::myGameView` (§3.6). **Opus review.**
7. Anti-cheat Playwright spec (§9). MUST pass before declaring done.
8. `aiAdvance` + `startNextRound` (rest of §3.4).
9. `heartbeat.ts` + scheduled function (§3.5).
10. Web integration (§5).
11. Lobby UI (§8 / §5.5).
12. End-to-end smoke: full match across two devices.

Each step gets its own kanban-style task and its own commit.

---

## 14. What to update when Phase 3 ships

- `README.md` — flip Phase 3 from "next up" to "shipped"; add online
  dev commands.
- `IDEAS.md` — add `[shipped]` entry summarizing what landed; flip
  any related `[in-progress]` entries.
- `CLAUDE.md` — extend the architecture invariants section to note
  the engine path alias and the view-filtering rule.
- New: `docs/api.md` covering every public Convex mutation/query,
  args, returns, error cases.
