import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const sendInvite = mutation({
    args: {
        gameId: v.id("games"),
        fromUserId: v.id("users"),
        toUserId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (game === null) throw new ConvexError("Game not found");
        if (game.phase !== "lobby") throw new ConvexError("Game is not in lobby");

        // Deduplicate: skip if a pending invite already exists.
        const existing = await ctx.db
            .query("gameInvites")
            .withIndex("by_from_user", (q) => q.eq("fromUserId", args.fromUserId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("toUserId"), args.toUserId),
                    q.eq(q.field("status"), "pending"),
                ),
            )
            .first();
        if (existing !== null) return;

        await ctx.db.insert("gameInvites", {
            gameId: args.gameId,
            fromUserId: args.fromUserId,
            toUserId: args.toUserId,
            status: "pending",
            createdAt: Date.now(),
        });
    },
});

export const dismissInvite = mutation({
    args: { inviteId: v.id("gameInvites"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const invite = await ctx.db.get(args.inviteId);
        if (invite === null) return;
        if (invite.toUserId !== args.userId) throw new ConvexError("Not your invite");
        await ctx.db.patch(args.inviteId, { status: "declined" });
    },
});

// Returns pending invites for the user, filtering out any whose game is no longer in lobby.
// Stale rows are silently skipped (cleanup is async, not a query concern).
export const getMyInvites = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const rows = await ctx.db
            .query("gameInvites")
            .withIndex("by_to_user", (q) =>
                q.eq("toUserId", args.userId).eq("status", "pending"),
            )
            .collect();

        const out = [];
        for (const inv of rows) {
            const game = await ctx.db.get(inv.gameId);
            if (game === null || game.phase !== "lobby") continue;
            const from = await ctx.db.get(inv.fromUserId);
            if (from === null) continue;
            out.push({
                inviteId: inv._id,
                gameId: inv.gameId,
                roomCode: game.roomCode,
                mode: game.mode,
                fromDisplayName: from.displayName,
                fromAvatar: from.avatar,
                createdAt: inv.createdAt,
            });
        }
        return out;
    },
});
