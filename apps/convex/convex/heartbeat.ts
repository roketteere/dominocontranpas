import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server.js";
import { internal } from "./_generated/api.js";

const GRACE_MS = 60_000; // 60s grace after a missed heartbeat
const MAX_AUTOPASS = 3; // After this many consecutive auto-passes, seat becomes AI

// Called every ~15s by the client while the game is open. Updates the seat's lastSeenAt so the
// scheduled enforceAutoPass function knows we're still here.
export const pingSeat = mutation({
    args: { gameId: v.id("games"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const seat = await ctx.db
            .query("seats")
            .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .unique();
        if (seat === null) return;
        await ctx.db.patch(seat._id, { lastSeenAt: Date.now() });
    },
});

// Scheduled function: scans active games for the seat whose turn it is, and if their lastSeenAt
// is older than the grace window, auto-passes their turn via the same engine pipeline as a real
// pass. After MAX_AUTOPASS consecutive auto-passes, the seat is converted to an AI fill-in.
// Reschedules itself every 15s.
export const enforceAutoPass = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const games = await ctx.db
            .query("games")
            .filter((q) => q.eq(q.field("phase"), "in_round"))
            .collect();
        for (const game of games) {
            const seat = await ctx.db
                .query("seats")
                .withIndex("by_game_position", (q) =>
                    q.eq("gameId", game._id).eq("position", game.turnIndex as 0 | 1 | 2 | 3),
                )
                .unique();
            if (seat === null) continue;
            if (seat.isAI) continue; // AI uses its own schedule
            if (now - seat.lastSeenAt < GRACE_MS) continue;

            // Trigger an auto-pass by scheduling the AI advance on this seat after marking it
            // AI. We DON'T immediately call passTurn here because passTurn requires userId and
            // we don't want to forge a call from the user. Instead promote the seat to AI for
            // this round.
            const nextCount = seat.autoPassCount + 1;
            if (nextCount >= MAX_AUTOPASS) {
                // Convert to AI fill-in permanently. Future turns are handled by the AI loop.
                await ctx.db.patch(seat._id, {
                    isAI: true,
                    userId: undefined,
                    autoPassCount: 0,
                });
            } else {
                await ctx.db.patch(seat._id, { autoPassCount: nextCount });
            }
            // Kick the AI advance to process this turn.
            await ctx.scheduler.runAfter(0, internal.games.aiAdvance, { gameId: game._id });
        }
        // Reschedule.
        await ctx.scheduler.runAfter(15_000, internal.heartbeat.enforceAutoPass, {});
    },
});

// Scheduled function: deletes stealAudit rows older than 48h. Reschedules itself every hour.
const AUDIT_RETENTION_MS = 48 * 60 * 60 * 1000;
export const cleanupStealAudit = internalMutation({
    args: {},
    handler: async (ctx) => {
        const cutoff = Date.now() - AUDIT_RETENTION_MS;
        const rows = await ctx.db.query("stealAudit").collect();
        for (const row of rows) {
            if (row.createdAt < cutoff) await ctx.db.delete(row._id);
        }
        await ctx.scheduler.runAfter(60 * 60 * 1000, internal.heartbeat.cleanupStealAudit, {});
    },
});
