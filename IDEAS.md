# IDEAS.md — Dominos Con Tranpas

Append-only log of features, proposals, and "remember-this" notes. Status
tags: `[idea]` → `[in-progress]` → `[shipped]` / `[parked]` / `[rejected]`.
Don't delete old entries; flip the status above.

---

## 2026-05-20 — Project genesis

### `[in-progress]` Phase 3 scaffolded (2026-05-20)
All Convex backend code + web online integration shipped. Awaiting
one-time `pnpm --filter convex dev` to provision the deployment;
`apps/convex/SETUP.md` is the runbook.

Backend (`apps/convex/`):
- `schema.ts`: users (anonymous deviceId), games, seats, playerHands,
  history, stealAudit. No email/username fields (deferred to Phase 4).
- `users.ts`: createOrGetUser, getUserById, getUserByDeviceId.
- `lobbies.ts`: createGame (6-char room code from unambiguous
  alphabet), joinByCode, addAiSeat, leaveLobby.
- `games.ts`: startMatch, playTile, passTurn, aiAdvance,
  startNextRound. Engine is the source of truth — assembles
  GameState from tables, runs validMoves → applyMove →
  resolveStealPhase → isRoundOver → applyRoundOutcome, persists
  back. Steal RNG audit-logged.
- `views.ts`: myGameView is the anti-cheat surface. Opponent hands
  appear as counts only; steal events mask `stolenTile` for
  non-involved viewers.
- `heartbeat.ts`: pingSeat + enforceAutoPass (60s grace, 3 auto-
  passes → AI fill-in) + cleanupStealAudit (48h retention,
  self-reschedules every hour).
- `crons.ts`: kicks the self-rescheduling scheduled functions on
  first deploy.

Open-question decisions taken without Joel's input (he authorized this):
- Auth: anonymous device-based identity instead of magic-link Resend.
- Friend invites: deferred to 3.5.
- Chat: deferred.
- Audit retention: 48h.

Web (`apps/web/src/`):
- `net/convexClient.ts`: ConvexReactClient init from VITE_CONVEX_URL.
- `net/useOnlineGame.ts`: subscribes to myGameView + bumps lastSeenAt.
- `state/identityStore.ts`: deviceId (localStorage UUID) + display
  name.
- `state/onlineGameStore.ts`: navigation state (which lobby screen).
- `ui/online/UsernameSetup.tsx`: first-time name input.
- `ui/online/LobbyHub.tsx`: Create / Join chooser.
- `ui/online/CreateGame.tsx`: mode picker (4p-partners / 2p).
- `ui/online/JoinGame.tsx`: paste 6-char code or follow ?join=
  deep-link.
- `ui/online/SeatPicker.tsx`: shows seats around the table, host
  can add AI fill-ins + start match.
- `ui/online/OnlineBoard.tsx`: reactive Convex subscription drives
  the board; mutations dispatch playTile / passTurn. Reuses Phase 2
  Tile / Hand / Chain / OpponentRow / ScoreBar.
- `ui/online/OnlineRoundEnd.tsx` + `OnlineMatchEnd.tsx`.
- MainMenu's "Play online" button is now live (was greyed out).
- App.tsx wraps everything in ConvexProvider; falls back to an
  "Online not configured" screen if VITE_CONVEX_URL is missing.

Anti-cheat ratchet: `apps/web/e2e/anti-cheat.spec.ts` scaffolded as a
Playwright spec. Requires deployment + `@playwright/test` install to
run. Failure means a hand leaked into a payload — must be fixed.

What's NOT done (deferred to Phase 3.5+):
- Friend invites + invite inbox table.
- Chat.
- Push notifications.
- Real auth (cross-device identity persistence).
- Mobile-real-device validation of the online flow.

### `[shipped]` Phase 2 closed (2026-05-20)
Joel playtested end-to-end on the live dev server; nothing else to fix
at this pass. Final iterations in this batch:
- True 90° CSS rotation (was 180° pip-swap; commits `66a637b`,
  `909fe23`). Scroll wheel + R + Shift+R + button all wired.
- Table layout: opponents at top/left/right per CCW PR convention
  (seat 1 left, seat 2 top, seat 3 right). Commits `e839450`,
  `1f65d5b`.
- Wooden domino-rack visual for the human's hand (gradient + inset
  shadow + groove stripe). `e839450`.
- Larger chain tiles + flex-wrap when out of room. `e839450`.
- Green halo for playable tiles, red dim for unplayable, all-red on
  a forced pass. `e839450`.
- Bilingual ES (PR) / EN (US) with persisted language toggle.

Closing this entry; the items below remain as Phase 3 / 3.5 follow-ups.

### `[shipped]` Phase 2 polish: tile rotation, visual matching, bilingual UI
Three iterations on top of Phase 2 in response to Joel's playtest feedback
(2026-05-20):
- **Visual matching bug:** placed tiles weren't visually showing matching
  pips touching. `PlacedTileView` had been re-normalizing through
  `tiles.makeTile()` (which sorts pips), so when the engine placed a tile
  with the higher pip on the visual left, the render still showed the
  lower pip on the left. Fix: added `flipped` prop to `Tile`, derived
  in `PlacedTileView` from whether `placed.leftPip === tile[0]`.
- **180° rotation:** per-tile flip state in `Board.tsx`, toggled via R
  key (window keydown, skips input/textarea) or the "Girar (R)" /
  "Rotate (R)" button next to the hand. Required adding dnd-kit sensor
  activation constraints (Pointer: 8px distance; Touch: 180ms delay) so
  taps don't fire accidental drags. Removed auto-play-on-tap so users
  can select a single-legal-side tile to flip it for visual taste.
- **Bilingual ES (PR) + EN (US):** new `src/i18n/` module with a string
  table, `useT()` hook, and `format(template, vars)` placeholder helper.
  `gameStore` gained `lang` + `setLang` with localStorage persistence
  (default from `navigator.language`). MainMenu got a "How to play /
  Cómo se juega" help section covering all six rule concepts.
- Commit: `9e308cf`.

### `[shipped]` Phase 2: solo-vs-AI playable end-to-end
React 19 + Vite 8 + Tailwind 4 PWA wired on top of the Phase 1 engine.
Components in `apps/web/src/ui/`: `Tile`, `Hand` (dnd-kit draggable),
`Chain` (with PR-style perpendicular doubles), `Board`, `OpponentRow`
(face-down tile backs + tile count + immunity flag), `ScoreBar`,
`MainMenu`, `RoundEnd`, `MatchEnd`. Heuristic AI in
`apps/web/src/ai/heuristicAi.ts`: prefers high-pip plays, saves doubles,
left-side tiebreak. Zustand store in `apps/web/src/state/gameStore.ts`
orchestrates the loop (apply move → resolve steal → check round end →
schedule next AI turn). Setup module `apps/web/src/engine/setup.ts`
adds Fisher-Yates shuffle, dealRound, defaultGameOptions,
fourPartnerSeats, plus a mulberry32 seeded RNG for tests and a crypto
RNG for prod.

Smoke-tested via playwright: menu loads, "Solo vs AI" launches a 4-seat
match (1 human + 3 AI), opener auto-plays, steal phase runs, board
renders with chain + hand + opponents + score, tile pips display
correctly (fixed mid-build when a percent-based dot height collapsed
to 0px inside a nested flex column).

Open follow-ups before Phase 3 multiplayer:
- No visual animation for steal events (the stolen tile just shows up
  in the human hand silently). Framer Motion fly-in would help.
- AI doesn't track which numbers opponents have passed on — currently
  a pure pip-priority heuristic.
- No tests yet for `ai/`, `state/`, `ui/`, `engine/setup.ts`. Engine
  is still at 99%+; integration coverage is open.
- Hand isn't sorted; tiles appear in deal order.
- Mobile layout designed mobile-first but not yet validated on a real
  phone.

### `[shipped]` Phase 1: pure rule engine + Vitest suite
First milestone landed in commits after the initial scaffold. Engine
modules in `apps/web/src/engine/`:
- `types.ts` — Tile, Hand, Chain, GameState, Move, StealEvent
- `tiles.ts` — constructors + helpers (28-tile set, normalize, etc.)
- `moves.ts` — `validMoves` + `applyMove`, chain placement logic
- `scoring.ts` — domino / capicúa / chuchazo / tranca / zapato + match-end
- `steal.ts` — `shouldSteal` + `resolveStealPhase` with injected RNG

48/48 Vitest tests passing. Coverage: 97% statements, 100% functions,
81% branches (the engine's hot paths are well-covered; uncovered
branches are defensive error paths). Branch threshold tuned to 80%
pragmatically for the first pass — see follow-up below.

### `[idea]` Branch coverage follow-up
Push engine branch coverage from 81% → 90%+ by adding edge-case tests:
- moves.ts L46-47, L71-72: chain placement when the matching pip is on
  the high side of the incoming tile
- scoring.ts L68-69, L176-178: tranca branch with empty hands lookup
  + isZapato edge case when winner has 0 (impossible, but coverage)
- steal.ts L31, L69-76: degenerate states (undefined target hand,
  rng clamp triggered)
- tiles.ts L61-62: tileFromString NaN path
Total ~6-8 small tests. Not blocking Phase 2.

### `[in-progress]` Core game: traditional Dominó Criollo + Tranpas steal mechanic
Joel: *"I am puerto rican. We love playing 'capi cu' ... I want to create a
regular puertorican domino game but, this game is called 'Dominos Con
Tranpas' because people can cheat and tell their partner via message or show
them in person their dominos. To combat that and make it fun, ... the next
person can take 1 domino from the previous player. IF they get down to 1,
as a reward to making it there, a person with 1 domino cannot have their 1
swapped."*

Decisions locked from the planning conversation:
- Tile set: **double-six** (28 tiles). Traditional PR rules.
- Modes (v1): **4-player partners**, **2-player**, **solo vs AI**. No
  double-nine variant.
- Steal: **after the playing player's turn**, **blind** (server RNG),
  **auto-resolve**. Immunity at 1 tile. First move of each round skips
  steal (no previous player). First round's opener gets stolen from
  immediately after playing 6-6 — intentional balance.
- Deployment: **standalone PWA first**, no Facebook Instant Games (Meta
  wound the platform down).
- Multiplayer: online only, **share-link + friend-list**. No public
  matchmaking in v1.
- Tech stack: React 19 + TS + Vite + Tailwind + Zustand + dnd-kit +
  Framer Motion (no Phaser). Convex backend.
- Install: **PWA first**, native Capacitor wrapper planned post-MVP.
- Monetization: **cosmetic-only, free packs from gameplay**. No paid
  randomized loot boxes (loot-box gambling regulation risk).

### `[idea]` Pokémon-TCG-style cosmetic packs
Joel: *"we can treat the domino backs like the back of trading cards with
domino packs for both front and back. Like pokemon trading card game. The
have a box for cards, we have a box for dominos, they got a card sleeve
we have back and front and so on."*

Proposed pack themes (designer call, not engineering):
- **Old San Juan** — colonial blue cobblestone backs, wrought-iron tile
  fronts
- **El Yunque** — rainforest greens, ceiba bark texture
- **Vejigantes** — carnival mask iconography, vivid red/yellow/black
- **Bomba y Plena** — barril drum textures, plena lettering on backs
- **Beach Day** — sand-textured backs, ocean-blue tile frames
- **Coquí Nights** — luminescent green on deep blue, glow effect for foils

Each pack contains: 1 tile-front + 1 tile-back + 1 table texture +
optional ultra-rare foil variant. Unlock via gameplay (10 wins → 1 pack;
first daily win → 1 pack; streak rewards).

### `[idea]` Push notifications: "It's your turn"
Async play across time zones (Joel's family is everywhere). Web Push works
on Android natively; iOS 16.4+ for installed PWAs. Make a turn timer
configurable per-game (60s / 5min / 24h "async" mode).

### `[idea]` Async / correspondence mode
Long-form game where players have up to 24h per turn. Useful for family
games played across work schedules. Push notification when your turn
starts; 24h timer; auto-pass + 3-strike-out otherwise.

### `[parked]` Public matchmaking with strangers
Deferred until there's a user base. Public queues feel dead without
critical mass and bring moderation burden.

### `[parked]` Paid randomized packs (loot-box style)
Triggers gambling regulation in Belgium / Netherlands / China / increasing
EU+UK scrutiny + platform IAP cuts. Revisit only if a product-market fit
emerges and a clean regulatory story exists.

### `[parked]` Facebook Instant Games port
Meta wound down major parts of FB Gaming. Not worth the platform-specific
constraints for a shrinking audience.
