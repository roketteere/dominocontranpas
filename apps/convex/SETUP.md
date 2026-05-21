# Convex deployment setup — one-time

This is the runbook for going from "code is in the repo" to "online
multiplayer is live." Run it once per environment (dev, prod).

## Prerequisites

- A Convex account (free tier is fine). Sign up at
  <https://convex.dev>.
- Node 18+, pnpm 9+.

## Steps

```bash
# From the repo root.
pnpm install   # if you haven't already
```

```bash
# Provision a Convex deployment. The first run will:
#   - Open a browser tab for OAuth (or print a code if no browser)
#   - Ask which Convex team + project name to use
#   - Push the schema + functions to the deployment
#   - Codegen apps/convex/_generated/* (these are gitignored)
#   - Write apps/web/.env.local with VITE_CONVEX_URL pointing at the new deployment
pnpm --filter convex dev
```

`convex dev` runs in watch mode — leave it running. It will hot-deploy
schema + function changes.

```bash
# In another shell, start the web dev server. Vite will pick up
# VITE_CONVEX_URL from apps/web/.env.local automatically.
pnpm --filter web dev
```

Open the printed URL, click **Play online**, enter a name, click
**Create a game** → share the room code with a friend.

## Production deploy

```bash
pnpm --filter convex deploy --prod
```

After the first prod deploy, set the production URL in your hosting
provider's env vars:

```
VITE_CONVEX_URL=https://your-prod-deployment.convex.cloud
```

Then build + deploy the web app (Vercel, Netlify, Cloudflare Pages,
plain S3 — all work):

```bash
pnpm --filter web build
# Upload apps/web/dist/ to your static host.
```

## Verifying anti-cheat

The load-bearing test of the whole phase is that no client ever sees
another player's hand contents. A scaffolded Playwright spec lives at
`apps/web/e2e/anti-cheat.spec.ts`. To run it:

```bash
pnpm --filter web add -D @playwright/test
pnpm --filter web exec playwright install chromium
# In a separate shell, dev server running:
pnpm --filter web exec playwright test e2e/anti-cheat.spec.ts
```

A failure means there's a leak in `apps/convex/views.ts::myGameView`.
Do not bypass — fix the leak.

## Audit log retention

`apps/convex/heartbeat.ts::cleanupStealAudit` is a scheduled function
that deletes `stealAudit` rows older than 48h. It self-reschedules
every hour. The first invocation is wired through
`apps/convex/crons.ts`, which runs once on first deploy.

## Reconnection grace

`apps/convex/heartbeat.ts::enforceAutoPass` runs every 15s. If the
current-turn seat hasn't pinged within 60s, the seat's
`autoPassCount` is incremented and the AI advance loop is kicked.
After 3 consecutive auto-passes, the seat is converted to an AI
fill-in.

## Removing a deployment

```bash
pnpm --filter convex exec convex deployment delete
```

Or delete from the Convex dashboard.
