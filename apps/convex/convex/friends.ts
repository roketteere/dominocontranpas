import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const sendFriendRequest = mutation({
    args: { callerId: v.id("users"), friendCode: v.string() },
    handler: async (ctx, args) => {
        const target = await ctx.db
            .query("users")
            .withIndex("by_friendCode", (q) => q.eq("friendCode", args.friendCode.toUpperCase()))
            .unique();
        if (target === null) throw new ConvexError("No player with that friend code");
        if (target._id === args.callerId) throw new ConvexError("You can't add yourself");

        const existing = await ctx.db
            .query("friendships")
            .withIndex("by_pair", (q) =>
                q.eq("requesterId", args.callerId).eq("addresseeId", target._id),
            )
            .unique();
        const reverse = await ctx.db
            .query("friendships")
            .withIndex("by_pair", (q) =>
                q.eq("requesterId", target._id).eq("addresseeId", args.callerId),
            )
            .unique();
        if (existing !== null || reverse !== null) {
            throw new ConvexError("Friend request already exists or you are already friends");
        }

        await ctx.db.insert("friendships", {
            requesterId: args.callerId,
            addresseeId: target._id,
            status: "pending",
            createdAt: Date.now(),
        });
        return target.displayName;
    },
});

export const acceptFriendRequest = mutation({
    args: { callerId: v.id("users"), friendshipId: v.id("friendships") },
    handler: async (ctx, args) => {
        const fs = await ctx.db.get(args.friendshipId);
        if (fs === null) throw new ConvexError("Request not found");
        if (fs.addresseeId !== args.callerId) throw new ConvexError("Not your request");
        if (fs.status !== "pending") throw new ConvexError("Request already handled");
        await ctx.db.patch(args.friendshipId, { status: "accepted" });
    },
});

export const declineFriendRequest = mutation({
    args: { callerId: v.id("users"), friendshipId: v.id("friendships") },
    handler: async (ctx, args) => {
        const fs = await ctx.db.get(args.friendshipId);
        if (fs === null) return;
        if (fs.addresseeId !== args.callerId && fs.requesterId !== args.callerId) {
            throw new ConvexError("Not your request");
        }
        await ctx.db.delete(args.friendshipId);
    },
});

export const removeFriend = mutation({
    args: { callerId: v.id("users"), friendshipId: v.id("friendships") },
    handler: async (ctx, args) => {
        const fs = await ctx.db.get(args.friendshipId);
        if (fs === null) return;
        if (fs.addresseeId !== args.callerId && fs.requesterId !== args.callerId) {
            throw new ConvexError("Not your friendship");
        }
        await ctx.db.delete(args.friendshipId);
    },
});

export const getFriends = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const asSender = await ctx.db
            .query("friendships")
            .withIndex("by_requester", (q) => q.eq("requesterId", args.userId))
            .filter((q) => q.eq(q.field("status"), "accepted"))
            .collect();
        const asReceiver = await ctx.db
            .query("friendships")
            .withIndex("by_addressee", (q) => q.eq("addresseeId", args.userId))
            .filter((q) => q.eq(q.field("status"), "accepted"))
            .collect();

        const out = [];
        for (const f of asSender) {
            const user = await ctx.db.get(f.addresseeId);
            if (user !== null) {
                out.push({
                    friendshipId: f._id,
                    userId: user._id,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    activeGameId: user.activeGameId,
                });
            }
        }
        for (const f of asReceiver) {
            const user = await ctx.db.get(f.requesterId);
            if (user !== null) {
                out.push({
                    friendshipId: f._id,
                    userId: user._id,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    activeGameId: user.activeGameId,
                });
            }
        }
        return out;
    },
});

export const getPendingRequests = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const incoming = await ctx.db
            .query("friendships")
            .withIndex("by_addressee", (q) => q.eq("addresseeId", args.userId))
            .filter((q) => q.eq(q.field("status"), "pending"))
            .collect();

        const out = [];
        for (const f of incoming) {
            const user = await ctx.db.get(f.requesterId);
            if (user !== null) {
                out.push({
                    friendshipId: f._id,
                    userId: user._id,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    createdAt: f.createdAt,
                });
            }
        }
        return out;
    },
});
