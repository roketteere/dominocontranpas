import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

const FC_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateFriendCode(): string {
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += FC_ALPHABET[Math.floor(Math.random() * FC_ALPHABET.length)];
    }
    return code;
}

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

        // Generate a unique friend code (collision extremely rare — 32^8 ≈ 1 trillion combos).
        let friendCode = generateFriendCode();
        for (let attempt = 0; attempt < 5; attempt++) {
            const collision = await ctx.db
                .query("users")
                .withIndex("by_friendCode", (q) => q.eq("friendCode", friendCode))
                .unique();
            if (collision === null) break;
            friendCode = generateFriendCode();
        }

        return await ctx.db.insert("users", {
            deviceId: args.deviceId,
            displayName: args.displayName,
            ...(args.avatar !== undefined && { avatar: args.avatar }),
            friendCode,
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
            avatar: user.avatar,
            friendCode: user.friendCode,
            activeGameId: user.activeGameId,
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
            avatar: user.avatar,
            friendCode: user.friendCode,
            activeGameId: user.activeGameId,
        };
    },
});
