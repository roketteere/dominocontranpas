# IDEAS.md — Dominos Con Tanpas

Append-only log of features, proposals, and "remember-this" notes. Status
tags: `[idea]` → `[in-progress]` → `[shipped]` / `[parked]` / `[rejected]`.
Don't delete old entries; flip the status above.

---

## 2026-05-20 — Project genesis

### `[in-progress]` Core game: traditional Dominó Criollo + Tanpas steal mechanic
Joel: *"I am puerto rican. We love playing 'capi cu' ... I want to create a
regular puertorican domino game but, this game is called 'Dominos Con
Tanpas' because people can cheat and tell their partner via message or show
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
