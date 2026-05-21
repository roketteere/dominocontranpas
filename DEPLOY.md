# Production deploy runbook

Two pieces ship separately:

- **Backend → Convex Cloud** (managed, free tier covers low DAU)
- **Frontend → Spaceship subdomain** (static files)

DNS lives on Spaceship; the Convex cloud URL is just an env var the
web bundle bakes in at build time.

---

## One-time setup

### 1. Convex Cloud account + deployment

```bash
npx convex login                              # opens browser, free signup
pnpm --filter convex deploy                   # creates prod deployment, prints the URL
```

Copy the printed URL (looks like `https://your-app-123.convex.cloud`).
Save it somewhere; you'll need it for every web build.

> Convex stores the active deployment in `apps/convex/.env.local`.
> Re-running `pnpm --filter convex deploy` later just pushes the
> latest schema + functions to that same deployment.

### 2. Spaceship subdomain

In your Spaceship dashboard:

1. Pick the domain you want to host on (e.g. `joelperez.com`).
2. Add a subdomain entry (e.g. `tranpas.joelperez.com`).
3. Point its document root at a folder you control (the dashboard
   walks you through this; varies by Easy Web Hosting plan vs other
   tiers).
4. Make sure HTTPS is enabled (Spaceship issues a free Let's Encrypt
   cert).

You also need a **SPA fallback rule**: every unknown path must serve
`index.html`. On Spaceship's Easy Web Hosting that's done via a
`.htaccess` file in the subdomain root (template below).

---

## Each release

```bash
# 1. Push latest backend code + schema to Convex Cloud
pnpm --filter convex deploy

# 2. Build the web bundle pointed at the Convex prod URL
CONVEX_PROD_URL="https://your-app-123.convex.cloud" \
  pnpm --filter web exec cross-env VITE_CONVEX_URL=$CONVEX_PROD_URL pnpm build

# 3. Upload apps/web/dist/* to your Spaceship subdomain root.
#    Drag-and-drop in their file manager, or use SFTP / rsync.
```

That's it. Open the subdomain in a browser; click Play online; share
a room code with a friend.

---

## .htaccess template

Drop this in the subdomain's web root alongside `index.html`. It
makes Spaceship's Apache serve `index.html` for any unknown path
(so client-side routes like `/join/ABCD23` work) and sets the right
MIME types for the audio files.

```apache
# SPA fallback — every non-file route serves index.html
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]

# Audio MIME types (so .wav / .m4a play in all browsers)
AddType audio/wav .wav
AddType audio/mp4 .m4a .mp4
AddType audio/ogg .ogg
AddType audio/aac .aac
AddType audio/flac .flac
AddType audio/webm .webm

# Cache static assets aggressively; the file names are content-hashed
<FilesMatch "\.(js|css|woff2?|ttf|otf|png|svg|jpg|gif|webp)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>

# Don't cache index.html or the audio manifest
<FilesMatch "^(index\.html|manifest\.json)$">
    Header set Cache-Control "no-cache"
</FilesMatch>
```

---

## Smoke-test the deploy

1. Open the subdomain in two browsers (different devices or one
   incognito).
2. Click **Play online** in both.
3. Create a game in browser A; copy the 6-char room code.
4. Paste the code in browser B; both land in the seat picker.
5. Host clicks **Start match**. Match begins. Tiles + steals work.
6. If anything errors, check the browser console first (likely a
   `VITE_CONVEX_URL` mismatch or a Spaceship SPA-fallback issue).

---

## Costs

- **Convex Cloud free tier:** 1 GB database + 1 GB file storage +
  1 M function calls/month. For a friend-group domino site you'll
  never hit this. If you do, paid tier starts ~$25/mo.
- **Spaceship Web Hosting:** $1.21–$2.87/mo (varies by tier + cycle).
- **Domain:** whatever you already pay Spaceship for it.

---

## Updating the backend without touching the web

```bash
pnpm --filter convex deploy
```

Schema migrations + new mutations + new queries push to the same
prod deployment. Web clients automatically pick up new APIs on the
next page load (or via the live subscription if they're connected).

You only need to re-build + re-upload the web bundle when you change
something in `apps/web/`.
