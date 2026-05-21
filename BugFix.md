# BugFix.md — Active bug + task channel for Opus ↔ qwen

Append-only. Status: `[open]` → `[in-progress]` → `[done]` / `[failed]` / `[blocked]` / `[verified]`.
Flip the status in the entry header; never delete entries. Resolutions go in-line.

## Conventions

- **Opus files entries.** Diagnoses the bug, lists suspect file:line,
  writes acceptance criteria. Reads `Expectations.md` and only enumerates
  rules unique to THIS bug (project-wide rules live there, not here).
- **qwen executes.** Reads the entry top-to-bottom, satisfies the
  acceptance criteria, writes a "Resolution" block at the bottom of the
  entry, and sets status to `[done]` (passed self-check) or `[failed]`
  (couldn't satisfy — with a one-line reason).
- **Opus verifies.** Re-reads on the next session, runs the verifier
  command from the entry, flips `[done]` → `[verified]` or back to
  `[in-progress]` with a `Reopened:` note explaining what failed.

## Status legend

| Tag | Meaning |
|---|---|
| `[open]` | Opus filed; qwen hasn't picked up yet. |
| `[in-progress]` | qwen claimed it; partial work may be on disk. |
| `[done]` | qwen self-graded pass; awaiting Opus verification. |
| `[failed]` | qwen tried, hit a wall, surfaced a question or blocker. |
| `[blocked]` | External dep (a deploy, a credential, a Joel decision). |
| `[verified]` | Opus confirmed end-to-end (typecheck + runtime smoke). |

## How qwen picks up work

1. `grep '\[open\]' BugFix.md` → list of available entries.
2. Read the chosen entry top to bottom.
3. Read `Expectations.md` fully (every dispatch, no exceptions).
4. Execute. Self-grade against the acceptance checkboxes.
5. Write a Resolution block at the bottom of the entry and flip the
   status tag in the header.

---

## BUG-001 — getMyInvites throws Server Error on lobby load `[done]`

**Reported by:** Joel (browser console, 2026-05-21)
**Severity:** crash — blocks OnlineHub render entirely once a user has any pending invite
**Surface:** Convex query at runtime; client logs `[CONVEX Q(invites:getMyInvites)] Server Error`

**Trace:**

```
optimistic_updates_impl.js:151 Uncaught Error:
  [CONVEX Q(invites:getMyInvites)] [Request ID: f7bdc53fb6d3cb3e] Server Error
  Called from LobbyHub.tsx:25
```

**Suspect surfaces (Opus pre-analysis):**

- `apps/convex/convex/invites.ts:50` — `getMyInvites` handler.
- `apps/convex/convex/schema.ts:122` — `gameInvites` table; the index
  `by_to_user` is `["toUserId", "status"]`, which matches handler usage.
  No obvious schema mismatch on the local side.
- Returned object reads `game.roomCode` (line 69). Check the `games`
  schema: if `roomCode` is `v.optional` and a game has it `undefined`,
  the returned object has `roomCode: undefined`. Convex serializes that
  as a missing field — usually fine, but worth confirming the live
  deployment matches the local schema.
- Referential drift: a `gameInvites` row whose `fromUserId` or `gameId`
  points at a deleted record. The handler guards `=== null` (lines 63 +
  65), so dangling refs should be silent, not throwing. Verify there's
  no third code path that throws on stale rows.
- **Most likely root cause:** the deployed Convex backend lags the local
  schema — either `gameInvites` table or `by_to_user` index isn't
  present in the live deployment. Phase A code landed locally; the
  deploy may not have run. Verify with `pnpm --filter convex dev` and
  re-test.

**Acceptance criteria (qwen self-checks before flipping `[done]`):**

- [ ] Root cause identified with evidence — paste the Convex
      dashboard log line, the reproducer, or the schema-mismatch diff
      into the Resolution block.
- [ ] If the fix is a code change: `apps/convex/convex/invites.ts`
      `getMyInvites` handler must return `[]` (or skip the bad row) when
      any single invite is malformed, instead of throwing. Log the
      malformed row server-side (`console.warn` with the inviteId) so
      cleanup can follow. Valid rows must still surface.
- [ ] If the fix is a deploy: paste the exact command in the Resolution
      block (`pnpm --filter convex dev`, the deployment URL touched, the
      timestamp).
- [ ] `pnpm --filter web exec tsc --noEmit` passes.
- [ ] `pnpm --filter convex exec tsc --noEmit` passes (or document
      why this filter isn't applicable in this repo's pnpm layout).
- [ ] Manual reproducer documented: "Open `/online` with at least one
      pending invite — no error in console; invite renders."

**Assigned to:** qwen (investigation + code fix); Joel (deploy step
if root cause is deployment drift).

**Resolution (qwen + Opus, 2026-05-21):**

- **Code fix:** `apps/convex/convex/invites.ts:50` — `getMyInvites` now
  wraps the per-row hydration body in an inner `try/catch` that
  `console.warn`s the offending `inviteId` and `continue`s; the whole
  handler body is also wrapped in an outer `try/catch` that
  `console.error`s and returns `[]` on catastrophic failure. Happy-path
  return shape is unchanged. `sendInvite` and `dismissInvite` untouched.
- **Type-system follow-on:** Convex tsconfig has `lib: ["ES2022"]` only,
  so `console` is not in scope at compile time even though it's
  available at runtime. Added
  `apps/convex/convex/globals.d.ts` with an ambient `declare const
  console` (warn/error/log). Scoped to the convex workspace only —
  doesn't pull in `DOM`.
- **Typecheck:** `pnpm --filter web exec tsc --noEmit` ✅,
  `pnpm --filter convex exec tsc --noEmit` ✅.
- **Deploy step (Joel):** still needs `pnpm --filter convex dev` against
  the live deployment for the index/table to be present remotely if
  Phase A schema hasn't been pushed yet. Code change alone won't fix
  the error if the table is genuinely missing in prod.
- **Dispatch artifact:** qwen brief at `BUG-001-brief.md` (gitignored),
  raw output at `invites.ts.out` (gitignored). Dispatch took ~25.6s,
  696 eval_count, output passed self-check on first emit.
- **Lesson captured in Expectations.md:** added a Convex bullet noting
  that `console.*` requires the ambient at
  `apps/convex/convex/globals.d.ts` (or future qwen will trip the same
  TS error).

---

## BUG-002 — Convex layer wiring for boneyard draw rule `[done]`

**Reported by:** Opus (follow-up to commit `dc5d3e7` — the boneyard
engine landed pure, but the Convex layer stubbed `boneyard: []`)
**Severity:** feature gap — solo had the draw rule, online did not
**Surface:** entire online stack (schema, mutations, views, UI)

**Scope (Opus, 2026-05-21):**

- `apps/convex/convex/schema.ts:games` — add optional
  `boneyard: v.optional(v.array(v.array(v.number())))`.
- `apps/convex/convex/games.ts`:
  - `startMatch` / `startNextRound` — persist `shuffled.slice(cursor)` as
    boneyard on the games row.
  - `assembleState` — deserialize game.boneyard (default `[]`) into the
    engine `Tile[]` form.
  - `persistState` — write boneyard on every patch.
  - New `drawTile` mutation — validates turn + non-empty boneyard,
    constructs `DrawMove` server-side using `state.boneyard[0]`, applies,
    persists. **Skips `resolveStealPhase`** (no steal on draw) and does
    **NOT** schedule AI advance (same seat is still on turn).
  - `aiAdvance` — branch on `move.kind === "draw"`: skip steal phase,
    reschedule `aiAdvance` 300ms later so the same AI seat re-evaluates
    (play / draw again / pass).
- `apps/convex/convex/views.ts:myGameView` — add `boneyardCount: number`
  to the return shape. Server-secret boneyard contents are NEVER exposed;
  only the count.
- `apps/web/src/ui/online/OnlineBoard.tsx`:
  - `viewToEngineState` consumes `view.boneyardCount`; populates engine
    `state.boneyard` with N placeholder tiles so client-side
    `validMoves` returns `[draw]` vs `[pass]` correctly. The DrawMove
    the engine produces carries a placeholder tile; the server's
    `drawTile` mutation ignores the client-side tile and uses the
    real `state.boneyard[0]`.
  - New `drawTile` mutation hook, `mustDraw` flag, `onDraw` handler,
    Draw button in the action bar (pr-coqui accent).
- `apps/web/src/ui/Board.tsx` (solo) — same `mustDraw` + Draw button
  pattern; routes to `submitHumanMove({ kind: "draw", playerId, tile })`.
- `apps/web/src/state/gameStore.ts` — both `submitHumanMove` and
  `advanceAi` skip `resolveStealPhase` when `move.kind === "draw"`.
  **Engine integration bug caught during this work:** without that
  guard, `lastActorPlayerId` (stale from the prior real turn) would
  mis-target the previous player on every draw.
- `apps/web/src/i18n/strings.ts` — new keys `draw`, `mustDraw`,
  `boneyard` (ES + EN). `Robar` / `Draw`.

**Verification:**

- `pnpm --filter web exec tsc --noEmit` ✅
- `pnpm --filter convex exec tsc --noEmit` ✅
- Engine vitest: 62/62 ✅
- Manual smoke (Joel): Solo 1v1 with a deep round — after both players
  have played all matching tiles, Draw button should appear (boneyard
  has tiles) and clicking it should grow the hand by one. Online 2p
  with two real players: same. Boneyard counter visible top of action bar.

**Deploy step (Joel):** `pnpm --filter convex dev` against the live
deployment to push the schema add + new `drawTile` mutation. Existing
in-flight games will read `game.boneyard ?? []` (no migration needed
for legacy rows; they just have an empty boneyard which is correct
for the way they were originally dealt).

**Done by:** Opus-direct (per the call: tightly-coupled across 5 files,
not a fit for qwen single-file dispatch).

---

## BUG-003 — Solo "1 vs 1 vs AI" actually spawns 3 AIs (4p) `[done]`

**Reported by:** Joel (2026-05-21) — "randomly, when play 2 players you vs ai,
it can spawn 3 AI making it a 2 vs 2 instead of 1 vs 1"
**Severity:** UX bug — entire solo mode runs the wrong shape
**Surface:** MainMenu → "Solo vs IA" / "Solo vs AI" buttons

**Trace / diagnosis (Opus, Sonnet Explore agent):**

`apps/web/src/state/gameStore.ts:82-102` — `startSoloMatch` is
**unconditionally** wired to a 4-seat partner layout:
`fourPartnerSeats(["Tú","Lefty","Compa","Tía Yari"], [false,true,true,true])`
plus `defaultGameOptions("solo-vs-ai", …)`. No branching on a mode flag.
Joel expects the "Solo vs IA" button to be **1v1** (1 human + 1 AI).
Confirmed by Explore agent that no other code path inserts AI seats
(heartbeat just flips `isAI` on an existing row; online `addAiSeat` is
gated by SeatPicker to positions [0,1] in 2p mode). The behavior is
100% deterministic; "randomly" was casual phrasing.

**Fix (qwen scope — pure engine + client state, no Convex):**

1. **Add `twoPlayerSeats` helper** in
   `apps/web/src/engine/setup.ts`. Mirrors `fourPartnerSeats` but
   returns 2 seats: position 0 team A (human), position 1 team B (AI).
   Signature:
   ```ts
   export function twoPlayerSeats(
       names: readonly [string, string],
       aiFlags: readonly [boolean, boolean],
   ): readonly PlayerSeat[]
   ```
2. **Rewrite `startSoloMatch`** in
   `apps/web/src/state/gameStore.ts:82` to use `twoPlayerSeats(["Tú","Tito"], [false,true])`
   and `defaultGameOptions("2p", opts?.enableTranpas ?? true)`. Keep
   the rest of the function (initialGameState → dealRound → set state
   → kick AI if opener is AI) intact.
3. Import `twoPlayerSeats` in `gameStore.ts`. Remove the
   `fourPartnerSeats` import if no longer used (verify with grep).

The mode literal becomes `"2p"`, which `dealRound` already routes
correctly (`isTwoPlayer = mode === "2p"` → 7 each + 14 boneyard).
With the boneyard rule shipped in commit `dc5d3e7`, the solo 1v1
game now also exercises the draw mechanic.

**Acceptance criteria (qwen self-checks before flipping `[done]`):**

- [ ] `setup.ts` exports a new `twoPlayerSeats(names, aiFlags)` that
      returns exactly 2 `PlayerSeat`s with positions 0 (team A) and 1
      (team B), `displayName` from `names`, `isAI` from `aiFlags`,
      `playerId = "seat-0"` / `"seat-1"`. Same shape pattern as
      `fourPartnerSeats`.
- [ ] `startSoloMatch` in `gameStore.ts` builds a 2-seat game using
      `twoPlayerSeats(["Tú","Tito"], [false,true])` and mode `"2p"`.
      AI name "Tito" matches the existing PR AI naming
      (`AI_NAMES[1] === "Tito"` in lobbies.ts).
- [ ] After dealRound, `state.seats.length === 2`, `state.hands` has
      exactly 2 entries with 7 tiles each, `state.boneyard.length === 14`.
- [ ] `pnpm --filter web exec tsc --noEmit` passes.
- [ ] `pnpm --filter web exec vitest run engine.test` still passes
      62/62 (no engine surface changed).
- [ ] No new imports beyond `twoPlayerSeats` in gameStore.ts. Do NOT
      add a UI option for "Solo 4p vs 3 AIs" — Joel explicitly wants
      1v1; leave the MainMenu buttons as-is.

**Out of scope:** anything Convex / online (mode option lists, schema,
addAiSeat bounds guard). If a defensive bounds check on `addAiSeat`
would be valuable, file it as a separate entry — don't bundle.

**Assigned to:** qwen (failed self-check); fallback Opus-direct.

**Resolution (Opus, 2026-05-21):**

- **Diagnosis confirmed by Sonnet Explore agent:** the only AI-seat
  insertion path in the codebase is `lobbies.ts:addAiSeat`, which is
  gated by SeatPicker UI to `positions=[0,1]` in 2p mode. There is no
  intermittent / racy path. The bug is `startSoloMatch` hardcoded to
  4 seats. "Randomly" was casual phrasing for "deterministically every
  time".
- **Code fix (Opus-direct, qwen failed):**
  - `apps/web/src/engine/setup.ts` — added `twoPlayerSeats(names, aiFlags)` between
    `fourPartnerSeats` and `initialGameState`, returning 2 PlayerSeats
    (pos 0 team A, pos 1 team B).
  - `apps/web/src/state/gameStore.ts` — import swap
    `fourPartnerSeats → twoPlayerSeats`; `startSoloMatch` now builds
    `twoPlayerSeats(["Tú","Tito"], [false,true])` with options mode
    `"2p"`. AI name `Tito` matches `AI_NAMES[1]` in lobbies.ts.
- **Verification:** `pnpm --filter web exec tsc --noEmit` ✅,
  62/62 engine tests pass. Manual smoke: Main Menu → "Solo vs IA · Con
  Tranpas" → game loads with 2 seats, host position 0 + Tito position 1.
  With boneyard rule already shipped, the 14 leftover tiles are now
  drawable.
- **qwen dispatch failure (BUG-003-brief.md → bug003.out):**
  qwen2.5-coder:7b emitted gameStore.ts content under the
  `===FILE: apps/web/src/engine/setup.ts===` header (wrong file),
  wrapped output in markdown ```typescript fences (banned by
  Expectations.md), did NOT apply the requested import swap or
  startSoloMatch rewrite, and produced empty content under the
  second `===FILE:` delimiter. Single dispatch (eval_count=1813,
  duration_ms=158078) — not worth re-dispatching given the trivial
  scope. Opus applied the two edits directly.
- **Lesson captured in Expectations.md:** added a brief-design note
  that multi-file dispatches with delimited output are unreliable for
  qwen2.5-coder:7b at this scope; prefer single-file dispatches.

Copy-paste this block when filing a new bug or task. Renumber the ID.

```markdown
## BUG-NNN — <short title> `[open]`

**Reported by:**
**Severity:** crash / regression / minor / cosmetic / chore
**Surface:**

**Trace:**

```
<exact error, stack, or symptom>
```

**Suspect surfaces (Opus pre-analysis):**

- `file:line` — what to look at

**Acceptance criteria (qwen self-checks before flipping `[done]`):**

- [ ] criterion 1 (must be verifiable from a shell command or runtime check)
- [ ] criterion 2

**Assigned to:**
**Resolution:** _(qwen fills this)_
```
