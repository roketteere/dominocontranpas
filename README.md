# Dominos Con Tranpas

A Puerto Rican–style online domino game with a twist: after every turn, the
next player blindly steals one tile from the player who just went. Reach
1 tile and you're immune. Built mobile-first as an installable PWA so
family on opposite ends of the island (and the diaspora) can play together
on their phones.

## What this is

Traditional **Dominó Criollo** rules (double-six, 4 players in 2 teams,
counter-clockwise, Capicu & chuchazo bonuses, lock / tranca scoring)
layered with one new mechanic: **Tranpas** ("tricks" / "cheats" in
PR slang, from *trampas*) — a forced cross-team tile steal that turns
the real-world cheating problem (partners signaling via text or
glance) into a deliberate part of the game.

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

# Convex backend (Phase 3) — one-time setup
# See apps/convex/SETUP.md for the full runbook.
pnpm --filter convex dev
```

## Status

Pre-alpha. **Phases 1 + 2 closed; Phase 3 scaffolded; Convex Cloud +
Netlify deploy wired (`netlify.toml` in repo). Runbook:
[DEPLOY.md](./DEPLOY.md).**

- **Phase 1 (engine):** pure rule engine in `apps/web/src/engine/`.
  58/58 Vitest tests, ~99% statement / ~92% branch coverage.
- **Phase 2 (solo-vs-AI UI):** React 19 + Vite 8 + Tailwind 4. Drag-
  and-drop tile play via dnd-kit, heuristic AI for 3 opponents,
  Zustand store orchestrating the move → steal → round-end loop.
  Bilingual ES (PR) + EN (US), wooden hand rack, table layout with
  opponents at top/left/right (CCW PR turn order), 90° tile rotation
  (R / Shift+R / scroll wheel / button), green/red playable tint.
- **Phase 3 (Convex multiplayer):** scaffolded — schema, mutations,
  queries, view-layer anti-cheat, scheduled functions (autopass +
  audit cleanup), web lobby UI (create / join / seat picker / online
  board). Anonymous device-based identity (no email, no magic link).
  One-time `pnpm --filter convex dev` needed to provision the
  deployment — see `apps/convex/SETUP.md` for the runbook.

See `IDEAS.md` for what's planned and what's parked. See the project's
plan at
`~/.claude/plans/i-am-puerto-rican-transient-gosling.md` for the full
roadmap.

## Admin CLI

A small Node CLI lives at `apps/admin-cli/` for owner-only user
management from the terminal. Wraps the same Convex queries the
in-browser AdminPanel uses, but without leaving your shell. Useful
when a family member asks for their recovery code or a co-admin
needs to be promoted.

Setup once:

```powershell
pnpm install
copy apps\admin-cli\.env.example apps\admin-cli\.env

# Find your userId without leaving the terminal: open the deployed
# Netlify URL, open DevTools console (F12), run
# localStorage.getItem('dct.deviceId'), then:
pnpm --filter admin-cli start whoami <paste-deviceId>

# Paste the printed userId into apps/admin-cli/.env as ADMIN_USER_ID.
# Then list everyone:
pnpm --filter admin-cli start list
```

Other commands (from repo root):

```powershell
pnpm --filter admin-cli start find joel            # filter by name
pnpm --filter admin-cli start set-owner <userId>   # promote a co-admin (needs OWNER_SECRET)
```

Full usage / output format / exit codes in `apps/admin-cli/README.md`.
The server-side `users:adminListUsers` query gates by
`isOwner === true` — if your `ADMIN_USER_ID` isn't an owner, the CLI
returns an empty list (exit code 3).

## Routing qwen to a remote ollama

`.qwen-dispatch.ps1` (gitignored, repo root) dispatches qwen briefs
to a local ollama at `http://localhost:11434` by default. When your
own machine is busy (another Claude session is using the GPU), you
can route through another ollama instance on the LAN — e.g. a
spouse's or family member's computer — without changing any code:

```powershell
$env:OLLAMA_URL = "http://192.168.1.42:11434"   # her LAN IP + port
.\.qwen-dispatch.ps1 -BriefPath .\BUG-NNN-brief.md -OutPath .\out.ts.out
# … runs on her GPU. Reverts to localhost when you unset the env var:
Remove-Item Env:OLLAMA_URL
```

One-time setup on the remote machine:

1. Install ollama and pull the model: `ollama pull qwen2.5-coder:7b`.
2. Expose ollama to the LAN — by default it binds to 127.0.0.1 only.
   Set the env var `OLLAMA_HOST=0.0.0.0:11434` (machine-wide
   recommended), then restart ollama.
3. Open Windows Firewall (or whatever firewall) on port 11434 inbound
   on the LAN profile.
4. From your machine, verify reachability:
   `curl http://<remote-ip>:11434/api/tags` should return her model
   list as JSON.

Once that works, dispatches from this repo will print
`ollama: http://192.168.x.x:11434/api/generate` at the top of each
run — confirmation that the remote endpoint is in use. The
`teki-bridge` project (separate repo at
`C:/Development/Claude/teki-bridge/`) is a GUI dispatcher that does
the same routing with health monitoring — drop-in replacement once
its HTTP/RPC surface lands.

The qwen self-check rules in `Expectations.md` apply regardless of
which ollama instance is serving the request.

## Game design highlights

- **Server-authoritative.** Clients never see opponent hands. The steal
  RNG runs on the server. This is non-negotiable — the entire anti-cheat
  premise depends on it.
- **Cosmetic-only progression.** Pokémon-TCG-style themed skin packs for
  domino fronts, backs, and table textures. Earned through gameplay, no
  paid randomized loot boxes (clean legal story).
- **Reconnection-friendly.** 60s grace window when a phone locks /
  network drops, so a missed call doesn't cost you a match.
