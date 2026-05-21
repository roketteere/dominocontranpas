import { v } from "convex/values";
import { query } from "./_generated/server.js";

// PR domino titles, awarded by lifetime match wins.
export const TITLES = [
    { minWins: 10000, name: "El Capicúa" },
    { minWins: 5000, name: "Campeón" },
    { minWins: 2000, name: "El Doble Seis" },
    { minWins: 1000, name: "Cuchillero" },
    { minWins: 500, name: "Tirador" },
    { minWins: 100, name: "Jugador" },
    { minWins: 0, name: "Novato" },
] as const;

export function titleForWins(wins: number): string {
    for (const t of TITLES) {
        if (wins >= t.minWins) return t.name;
    }
    return "Novato";
}

export const getMyStats = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const stats = await ctx.db
            .query("userStats")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();
        if (stats === null) {
            return {
                wins: 0,
                losses: 0,
                gamesPlayed: 0,
                totalPoints: 0,
                capicuaWins: 0,
                chuchazoWins: 0,
                stealCount: 0,
                title: "Novato",
                winRate: 0,
            };
        }
        const winRate =
            stats.gamesPlayed > 0
                ? Math.round((stats.wins / stats.gamesPlayed) * 100)
                : 0;
        return { ...stats, title: titleForWins(stats.wins), winRate };
    },
});

export const getLeaderboard = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const rows = await ctx.db
            .query("userStats")
            .withIndex("by_wins")
            .order("desc")
            .take(args.limit ?? 50);

        const out = [];
        for (const row of rows) {
            const user = await ctx.db.get(row.userId);
            if (user === null) continue;
            const winRate =
                row.gamesPlayed > 0
                    ? Math.round((row.wins / row.gamesPlayed) * 100)
                    : 0;
            out.push({
                userId: row.userId,
                displayName: user.displayName,
                avatar: user.avatar,
                wins: row.wins,
                losses: row.losses,
                gamesPlayed: row.gamesPlayed,
                winRate,
                title: titleForWins(row.wins),
            });
        }
        return out;
    },
});

export const getFriendsLeaderboard = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Collect friend user IDs from both directions.
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

        const friendIds = new Set<string>();
        friendIds.add(args.userId as unknown as string);
        for (const f of asSender) friendIds.add(f.addresseeId as unknown as string);
        for (const f of asReceiver) friendIds.add(f.requesterId as unknown as string);

        const out = [];
        for (const uid of friendIds) {
            const stats = await ctx.db
                .query("userStats")
                .withIndex("by_user", (q) => q.eq("userId", uid as unknown as typeof args.userId))
                .unique();
            const user = await ctx.db.get(uid as unknown as typeof args.userId);
            if (user === null) continue;
            const wins = stats?.wins ?? 0;
            const losses = stats?.losses ?? 0;
            const gamesPlayed = stats?.gamesPlayed ?? 0;
            const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
            out.push({
                userId: uid,
                displayName: user.displayName,
                avatar: user.avatar,
                wins,
                losses,
                gamesPlayed,
                winRate,
                title: titleForWins(wins),
                isMe: uid === (args.userId as unknown as string),
            });
        }
        out.sort((a, b) => b.wins - a.wins);
        return out;
    },
});
