# Dominos Con Tanpas

A Puerto Rican–style online domino game with a twist: after every turn, the
next player blindly steals one tile from the player who just went. Reach
1 tile and you're immune. Built mobile-first as an installable PWA so
family on opposite ends of the island (and the diaspora) can play together
on their phones.

## What this is

Traditional **Dominó Criollo** rules (double-six, 4 players in 2 teams,
counter-clockwise, capicúa & chuchazo bonuses, lock / tranca scoring)
layered with one new mechanic: **Tanpas** (lit. "lids" / "caps") — a
forced cross-team tile steal that turns the real-world cheating problem
(partners signaling via text or glance) into a deliberate part of the
game.

## Modes

- **4-player online** with partners (canonical)
- **2-player online** (each player holds 7, remaining 14 are dead)
- **Solo vs heuristic AI** (3 AI opponents, one is your partner)

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind + Zustand +
  dnd-kit + Framer Motion
- **Backend:** Convex (auth + realtime + DB + server functions, all TS)
- **PWA:** Workbox service worker, web push for "your turn" alerts
- **Native:** Capacitor wrapper planned post-MVP (PWA-first)

## Development

```bash
# Install workspace deps
pnpm install

# Dev server (Vite — picks a free port, default 5173)
pnpm --filter web dev

# Engine tests
pnpm --filter web test
pnpm --filter web test:watch       # watch mode

# Coverage report
pnpm --filter web exec vitest run --coverage

# TypeScript typecheck (no emit)
pnpm --filter web typecheck

# Production build
pnpm --filter web build
pnpm --filter web preview          # serve the built bundle

# Phase 3+ (not yet scaffolded):
# pnpm --filter convex dev          # convex backend
```

## Status

Pre-alpha. **Phase 1 + 2 done.**

- **Phase 1 (engine):** pure rule engine in `apps/web/src/engine/`.
  58/58 Vitest tests, ~99% statement / ~92% branch coverage.
- **Phase 2 (solo-vs-AI UI):** React 19 + Vite 8 + Tailwind 4. Drag-
  and-drop tile play via dnd-kit, heuristic AI for 3 opponents,
  Zustand store orchestrating the move → steal → round-end loop.
  Smoke-tested with Playwright end-to-end.

Next up: Phase 3 — Convex backend + online multiplayer.

See `IDEAS.md` for what's planned and what's parked. See the project's
plan at
`~/.claude/plans/i-am-puerto-rican-transient-gosling.md` for the full
roadmap.

## Game design highlights

- **Server-authoritative.** Clients never see opponent hands. The steal
  RNG runs on the server. This is non-negotiable — the entire anti-cheat
  premise depends on it.
- **Cosmetic-only progression.** Pokémon-TCG-style themed skin packs for
  domino fronts, backs, and table textures. Earned through gameplay, no
  paid randomized loot boxes (clean legal story).
- **Reconnection-friendly.** 60s grace window when a phone locks /
  network drops, so a missed call doesn't cost you a match.
