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

## BUG-001 — getMyInvites throws Server Error on lobby load `[open]`

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

**Resolution:** _(qwen fills this on `[done]`; include commit SHA(s),
file:line refs for the fix, and any cleanup queries run)._

---

## Template for new entries

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
