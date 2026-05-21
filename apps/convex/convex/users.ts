import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

// Create a user row if no row with this deviceId exists, otherwise return the existing _id.
// Anonymous identity: deviceId is generated client-side and stored in localStorage.
export const createOrGetUser = mutation({
    args: {
        deviceId: v.string(),
        displayName: v.string(),
        avatar: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
            .unique();
        if (existing !== null) {
            if (args.avatar !== undefined && existing.avatar !== args.avatar) {
                await ctx.db.patch(existing._id, { avatar: args.avatar });
            }
            return existing._id;
        }
        return await ctx.db.insert("users", {
            deviceId: args.deviceId,
            displayName: args.displayName,
            ...(args.avatar !== undefined && { avatar: args.avatar }),
            createdAt: Date.now(),
        });
    },
});

// Public profile lookup by Convex user _id.
export const getUserById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (user === null) return null;
        return {
            _id: user._id,
            deviceId: user.deviceId,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
        };
    },
});

// Public profile lookup by client-side deviceId. Returns null if no user has registered yet.
export const getUserByDeviceId = query({
    args: { deviceId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
            .unique();
        if (user === null) return null;
        return {
            _id: user._id,
            deviceId: user.deviceId,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
        };
    },
});
