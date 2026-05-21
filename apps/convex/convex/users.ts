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

function generateRecoveryCode(): string {
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
            if (existing.recoveryCode === undefined) {
                let recoveryCode = generateRecoveryCode();
                for (let attempt = 0; attempt < 5; attempt++) {
                    const collision = await ctx.db
                        .query("users")
                        .withIndex("by_recoveryCode", (q) => q.eq("recoveryCode", recoveryCode))
                        .unique();
                    if (collision === null) break;
                    recoveryCode = generateRecoveryCode();
                }
                await ctx.db.patch(existing._id, { recoveryCode });
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

        let recoveryCode = generateRecoveryCode();
        for (let attempt = 0; attempt < 5; attempt++) {
            const collision = await ctx.db
                .query("users")
                .withIndex("by_recoveryCode", (q) => q.eq("recoveryCode", recoveryCode))
                .unique();
            if (collision === null) break;
            recoveryCode = generateRecoveryCode();
        }

        return await ctx.db.insert("users", {
            deviceId: args.deviceId,
            displayName: args.displayName,
            ...(args.avatar !== undefined && { avatar: args.avatar }),
            friendCode,
            recoveryCode,
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
            recoveryCode: user.recoveryCode,
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
            recoveryCode: user.recoveryCode,
            isOwner: user.isOwner ?? false,
            activeGameId: user.activeGameId,
        };
    },
});

// Claim an existing identity on a new device using a recovery code. Re-keys the existing user
// row's deviceId to args.deviceId so the new device's getUserByDeviceId() picks it up. If the
// new device already had a brand-new anonymous row (empty displayName, no friends, no stats),
// delete it before the patch. Returns the claimed user's _id, or null if the code didn't match.
export const claimByRecoveryCode = mutation({
    args: { recoveryCode: v.string(), deviceId: v.string() },
    handler: async (ctx, args) => {
        const target = await ctx.db
            .query("users")
            .withIndex("by_recoveryCode", (q) => q.eq("recoveryCode", args.recoveryCode))
            .unique();
        if (target === null) return null;

        // If a separate anonymous row exists for this deviceId (and isn't the target), delete it.
        const existingForDevice = await ctx.db
            .query("users")
            .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
            .unique();
        if (existingForDevice !== null && existingForDevice._id !== target._id) {
            await ctx.db.delete(existingForDevice._id);
        }

        await ctx.db.patch(target._id, { deviceId: args.deviceId });
        return target._id;
    },
});

// Return the user's own recovery code. Used by ProfileEditor to display it for the user.
export const getMyRecoveryCode = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (user === null) return null;
        return user.recoveryCode ?? null;
    },
});

// One-time owner bootstrap. The OWNER_SECRET Convex env var must match for the call to succeed.
// Sets isOwner=true on the given userId. Persists across devices (it's on the user row, not
// the device).
export const claimOwnership = mutation({
    args: { secret: v.string(), userId: v.id("users") },
    handler: async (ctx, args) => {
        const expected = process.env.OWNER_SECRET;
        if (expected === undefined || expected === "") {
            throw new Error("OWNER_SECRET is not configured");
        }
        if (args.secret !== expected) {
            throw new Error("Bad secret");
        }
        const user = await ctx.db.get(args.userId);
        if (user === null) throw new Error("User not found");
        await ctx.db.patch(args.userId, { isOwner: true });
    },
});

// Owner-only listing of every user with their recovery code. Used by AdminPanel.tsx so Joel
// can help friends/family who lose their code. Returns [] for any caller whose userId does
// not resolve to a user with isOwner === true.
export const adminListUsers = query({
    args: { requestingUserId: v.id("users") },
    handler: async (ctx, args) => {
        const me = await ctx.db.get(args.requestingUserId);
        if (me === null || me.isOwner !== true) return [];
        const rows = await ctx.db.query("users").collect();
        rows.sort((a, b) => b.createdAt - a.createdAt);
        return rows.map((r) => ({
            userId: r._id,
            displayName: r.displayName,
            friendCode: r.friendCode ?? null,
            recoveryCode: r.recoveryCode ?? null,
            createdAt: r.createdAt,
        }));
    },
});
