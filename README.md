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

# Engine tests (Phase 1)
pnpm --filter web test
pnpm --filter web test:watch       # watch mode

# Coverage report
pnpm --filter web exec vitest run --coverage

# TypeScript typecheck (no emit)
pnpm --filter web typecheck

# Phase 2+ (not yet scaffolded):
# pnpm --filter web dev             # vite dev server
# pnpm --filter convex dev          # convex backend
```

## Status

Pre-alpha. **Phase 1 done:** pure rule engine + Vitest suite (48/48
passing, 97% statement coverage). Engine lives in
`apps/web/src/engine/` as React-free, Convex-free, IO-free TypeScript
so the same code can run client-side (optimistic UI, offline solo) and
server-side (Convex move validation, source of truth).

Next up: Phase 2 — solo-vs-AI UI on top of the engine.

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
