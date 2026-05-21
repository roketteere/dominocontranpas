# dominoscontranpas — Admin CLI

Owner-only terminal tool for managing users. Wraps the same Convex
queries the in-browser AdminPanel uses, but from a shell so you can
grep / copy-paste / script. Useful when a friend or family member
loses their recovery code and pings you for help.

## Setup (once)

From the repo root:

```powershell
pnpm install
cd apps/admin-cli
copy .env.example .env
```

Then edit `.env` and fill in:

- `CONVEX_URL` — the prod Convex deployment URL. Already pre-filled
  in `.env.example`; leave as-is unless you've spun up a new
  deployment.
- `ADMIN_USER_ID` — your `users._id`. Find it via the Convex
  dashboard → Data → `users` table → find the row matching your
  display name → copy the `_id` value (long base32 string starting
  with `j...` or similar).
- `OWNER_SECRET` — optional, only needed for `set-owner`. Must match
  the `OWNER_SECRET` env var on your Convex deployment.

## Commands

All run from the repo root:

```powershell
# List every user with their friend code + recovery code + creation date.
pnpm --filter admin-cli start list

# Filter the list by display-name substring (case-insensitive).
pnpm --filter admin-cli start find tia
pnpm --filter admin-cli start find joel

# Promote a user to owner. Requires OWNER_SECRET in .env.
pnpm --filter admin-cli start set-owner <userId>
```

## Output

`list` / `find` print a fixed-width table:

```
DISPLAY NAME          FRIEND CODE  RECOVERY CODE  CREATED
Joel                  ABCD2345     XYZ23456       2026-05-19
Tía María             QWER7890     PQRS5678       2026-05-21
```

`set-owner` prints a single success / error line.

## Exit codes

- `0` — success
- `1` — bad args (unknown subcommand, missing arg)
- `2` — env not configured (CONVEX_URL or ADMIN_USER_ID missing)
- `3` — Convex returned an empty result (often = ADMIN_USER_ID
  doesn't have `isOwner: true` on its row)
- `4` — Convex error (network, schema mismatch, etc.)

## Gating

The server-side `users:adminListUsers` query checks
`users[ADMIN_USER_ID].isOwner === true` and returns `[]` for anyone
else. This CLI does no gating on its own — it just relays the env
value. If you accidentally share the CLI with someone who has a
non-owner `ADMIN_USER_ID`, they'll get nothing back. Don't share your
`OWNER_SECRET`.
