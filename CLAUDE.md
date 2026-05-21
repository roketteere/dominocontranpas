# CLAUDE.md — Dominos Con Tanpas

Per-project Claude guidance. Read at session start alongside
`IDEAS.md` and `MEMORY.md`.

## What this project is

Online Puerto Rican domino game. Traditional **Dominó Criollo** rules
plus a unique anti-cheat steal mechanic ("Tanpas"). Mobile-first PWA,
React + TypeScript + Convex backend.

Full implementation plan:
`~/.claude/plans/i-am-puerto-rican-transient-gosling.md`

## Architecture invariants — DO NOT VIOLATE

1. **Server is the only source of truth.** The game state — every hand,
   the deck order, turn pointer, score — lives on the Convex server. The
   client receives only what its player is allowed to see (own hand,
   public chain, opponent tile counts, score).

2. **Never put opponent-hand data in client-readable payloads.** Even
   during steal animations, the stealer's client sees only the *one*
   tile they received, never the source's full hand. If you're tempted
   to ship a "loading state" that includes more data "just for the
   animation," DON'T — it's the entire anti-cheat premise.

3. **Steal RNG must run on the server.** The client never picks which
   tile is stolen. Server uses Convex's `crypto.getRandomValues`
   (deterministic-by-seed for tests, real RNG in prod). Audit-log the
   seed + result with 48h retention for dispute resolution.

4. **The rule engine is pure and shared.** Everything in
   `apps/web/src/engine/` must be pure functions of `(state, input) →
   state`. No React imports, no Convex imports, no I/O, no `Math.random`
   directly — accept an RNG function as a parameter. The same code runs
   in both the React app (optimistic UI, offline solo) and the Convex
   server functions (move validation, source of truth).

5. **Cosmetics are data, not code.** A new tile-front skin is a JSON
   entry + an asset URL. The engine never branches on skin identity.

## Project structure (target)

```
apps/
├── web/           ← React PWA (Vite)
│   └── src/
│       ├── engine/    ← PURE rule engine (shared)
│       ├── ai/        ← Heuristic AI for solo mode
│       ├── ui/        ← React components
│       ├── net/       ← Convex client hooks
│       └── pwa/       ← Service worker, manifest
└── convex/        ← Convex backend (functions + schema; Phase 3)
                     imports the engine via a TS path alias
                     `@engine/*` → `../web/src/engine/*`
```

## Coding conventions

- **TypeScript strict mode.** No `any`. Prefer `unknown` + type guards.
- **Pure engine.** If a file lives in `engine/`, it imports nothing from
  React, Convex, dnd-kit, or any I/O. If you need that, the function
  belongs in `ui/` or `net/` instead.
- **Tile representation:** `[a, b]` where `a <= b`. Always normalize on
  construction. `[6, 6]` not `[6, 6.0]`.
- **Player IDs are stable** across reconnections (Convex user ID), not
  ephemeral seat numbers.
- **Don't comment the obvious.** Save comments for non-obvious
  invariants (e.g., why steal RNG seed is logged, why hand is sorted by
  pip total).

## Testing

- Engine: Vitest, target 95%+ coverage. The engine is pure functions —
  tests should be exhaustive (every win condition, every tranca shape,
  every steal edge case).
- UI: don't test components heavily — engine tests catch the logic. Use
  Playwright for end-to-end smoke (lobby → match → score screen).
- Multiplayer: use Convex's test harness to simulate two clients;
  assert that each client's hand subscription returns only its own
  tiles.

## When making changes that affect other Claude sessions

Per Joel's global rules (~/.claude/CLAUDE.md):
- Commit + push + update README/IDEAS/CLAUDE after every meaningful
  change. The GitHub remote exists (created 2026-05-20 after Phase 2
  closed), so routine pushes are authorized.
- Until kt is back online, skip kanban filing — log forward-looking
  ideas in `IDEAS.md` instead.
- Destructive remote operations (force push, branch delete on origin,
  etc.) still need Joel's explicit OK each time.

## Cultural correctness

Joel is Puerto Rican. The product is a love letter to PR domino culture.
- Spanish rule names (capicúa, chuchazo, tranca, paso, zapato) should
  appear in the UI, not just English equivalents.
- Default themes lean into PR iconography: flag colors, El Morro,
  El Yunque, vejigantes, coquí, etc.
- If in doubt about cultural accuracy, **ask Joel** — don't guess.
