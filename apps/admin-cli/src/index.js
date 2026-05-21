// Owner-only admin CLI for dominoscontranpas.
//
// Wraps the same Convex `users:adminListUsers` query the in-browser AdminPanel uses, plus the
// `users:claimOwnership` mutation for promoting a co-admin. The Convex server enforces the owner
// check (returns [] when ADMIN_USER_ID does not have isOwner=true), so the CLI itself does no
// gating beyond relaying the env values.
//
// Subcommands:
//   list                 — print every user
//   find <substring>     — filter by displayName (case-insensitive)
//   set-owner <userId>   — promote a user; requires OWNER_SECRET in env
//
// Exit codes: 0 ok, 1 bad args, 2 env missing, 3 empty result, 4 convex error.

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const CONVEX_URL = process.env.CONVEX_URL;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
const OWNER_SECRET = process.env.OWNER_SECRET;

function die(code, message) {
    console.error(message);
    process.exit(code);
}

const [subcommand, ...args] = process.argv.slice(2);
const HELP = new Set([undefined, "help", "--help", "-h"]);

// `help` (and no-args) must work without env so first-time users can see usage. Real commands
// check env themselves below.
function requireEnv() {
    if (!CONVEX_URL) die(2, "CONVEX_URL not set — copy .env.example to .env and fill it in.");
    if (!ADMIN_USER_ID) die(2, "ADMIN_USER_ID not set — find your users._id in the Convex dashboard.");
}

let client = null;
function getClient() {
    requireEnv();
    if (client === null) client = new ConvexHttpClient(CONVEX_URL);
    return client;
}

function formatDate(ms) {
    if (typeof ms !== "number") return "—";
    return new Date(ms).toISOString().slice(0, 10);
}

function printUserTable(users) {
    if (users.length === 0) {
        console.log("(no users)");
        return;
    }
    const headers = ["DISPLAY NAME", "FRIEND CODE", "RECOVERY CODE", "CREATED"];
    const rows = users.map((u) => [
        u.displayName || "—",
        u.friendCode || "—",
        u.recoveryCode || "—",
        formatDate(u.createdAt),
    ]);
    const widths = headers.map((h, i) =>
        Math.max(h.length, ...rows.map((r) => String(r[i]).length)),
    );
    const fmt = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join("  ");
    console.log(fmt(headers));
    console.log(fmt(widths.map((w) => "-".repeat(w))));
    for (const row of rows) console.log(fmt(row));
    console.log(`\n${users.length} user${users.length === 1 ? "" : "s"}`);
}

async function cmdList() {
    let users;
    try {
        users = await getClient().query("users:adminListUsers", { requestingUserId: ADMIN_USER_ID });
    } catch (e) {
        die(4, `Convex error: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (users.length === 0) {
        console.error(
            "Empty result. Likely cause: ADMIN_USER_ID does not have isOwner=true on its row.\n" +
            "Verify in Convex dashboard → Data → users → your row → isOwner column.",
        );
        process.exit(3);
    }
    printUserTable(users);
}

async function cmdFind(needle) {
    if (!needle) die(1, "usage: find <substring>");
    let users;
    try {
        users = await getClient().query("users:adminListUsers", { requestingUserId: ADMIN_USER_ID });
    } catch (e) {
        die(4, `Convex error: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (users.length === 0) {
        die(3, "Empty result — ADMIN_USER_ID likely not an owner.");
    }
    const n = needle.toLowerCase();
    const filtered = users.filter(
        (u) =>
            u.displayName.toLowerCase().includes(n) ||
            (u.friendCode || "").toLowerCase().includes(n) ||
            (u.recoveryCode || "").toLowerCase().includes(n),
    );
    printUserTable(filtered);
}

async function cmdSetOwner(userId) {
    if (!userId) die(1, "usage: set-owner <userId>");
    if (!OWNER_SECRET) die(2, "OWNER_SECRET not set in .env — required for set-owner.");
    try {
        await getClient().mutation("users:claimOwnership", { secret: OWNER_SECRET, userId });
    } catch (e) {
        die(4, `Convex error: ${e instanceof Error ? e.message : String(e)}`);
    }
    console.log(`set isOwner=true on ${userId}`);
}

function usage() {
    console.log("usage:");
    console.log("  pnpm --filter admin-cli start list");
    console.log("  pnpm --filter admin-cli start find <substring>");
    console.log("  pnpm --filter admin-cli start set-owner <userId>");
}

switch (subcommand) {
    case "list":
        await cmdList();
        break;
    case "find":
        await cmdFind(args[0]);
        break;
    case "set-owner":
        await cmdSetOwner(args[0]);
        break;
    case undefined:
    case "help":
    case "--help":
    case "-h":
        usage();
        break;
    default:
        console.error(`unknown subcommand: ${subcommand}`);
        usage();
        process.exit(1);
}
