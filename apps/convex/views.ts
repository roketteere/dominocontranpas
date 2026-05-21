import { v } from "convex/values";
import { query } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";

// myGameView is THE anti-cheat surface. It is invoked by the player's own subscription. The
// payload contains: full game state, the caller's own hand, opponent hand TILE COUNTS only,
// and a history where steal events show the stolen tile only when the caller is the source or
// the target. The caller's `userId` is the gate.
//
// If you add a field to this return shape, audit whether it leaks any other seat's hand. If you
// don't know, default to no.
export const myGameView = query({
    args: { gameId: v.id("games"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (game === null) return null;
        const seats = await ctx.db
            .query("seats")
            .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
            .collect();
        seats.sort((a, b) => a.position - b.position);
        const mySeat = seats.find((s) => s.userId === args.userId);
        // The caller might be a spectator (e.g. shared screen). Return public-only view.
        const mySeatPosition = mySeat?.position ?? null;

        // Hands: caller gets their own contents; everyone else gets just a count.
        const handsRows = await ctx.db
            .query("playerHands")
            .withIndex("by_game_seat", (q) => q.eq("gameId", args.gameId))
            .collect();
        const ownHand: number[][] | null =
            mySeatPosition === null
                ? null
                : handsRows.find((h) => h.seatPosition === mySeatPosition)?.tiles ?? null;
        const opponentCounts: Record<number, number> = {};
        for (const row of handsRows) {
            if (row.seatPosition !== mySeatPosition) {
                opponentCounts[row.seatPosition] = row.tiles.length;
            }
        }

        // History: replay everything but mask steal payloads when caller is not involved.
        const historyRows = await ctx.db
            .query("history")
            .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
            .collect();
        historyRows.sort((a, b) => a.turnNumber - b.turnNumber);
        const myEnginePid =
            mySeatPosition === null ? null : `seat-${mySeatPosition}`;
        const history = historyRows.map((row) => {
            const entry = row.entry as {
                kind: string;
                fromPlayerId?: string;
                toPlayerId?: string;
                stolenTile?: readonly number[];
                [key: string]: unknown;
            };
            if (entry.kind !== "steal") return entry;
            const involved =
                myEnginePid !== null &&
                (entry.fromPlayerId === myEnginePid || entry.toPlayerId === myEnginePid);
            if (involved) return entry;
            // Mask the stolen tile content from non-involved viewers.
            return { ...entry, stolenTile: null };
        });

        return {
            gameId: game._id,
            roomCode: game.roomCode,
            phase: game.phase,
            mode: game.mode,
            round: game.round,
            turnIndex: game.turnIndex,
            turnNumber: game.turnNumber,
            scores: game.scores,
            options: game.options,
            chain: game.chain,
            lastOutcome: game.lastOutcome,
            seats: seats.map((s) => ({
                position: s.position,
                team: s.team,
                isAI: s.isAI,
                displayName: s.displayName,
                userId: s.userId,
                autoPassCount: s.autoPassCount,
            })),
            mySeatPosition,
            myHand: ownHand,
            opponentCounts,
            history,
            hostUserId: game.hostUserId,
        };
    },
});

// List the games a user is seated in (lobby + in_round + round_end). Useful for the lobby
// chooser screen so the user can rejoin a game in progress.
export const listMyGames = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const seats = await ctx.db
            .query("seats")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        const games: { gameId: Id<"games">; phase: string; roomCode: string }[] = [];
        for (const seat of seats) {
            const game = await ctx.db.get(seat.gameId);
            if (game === null) continue;
            if (game.phase === "abandoned") continue;
            games.push({
                gameId: game._id,
                phase: game.phase,
                roomCode: game.roomCode,
            });
        }
        return games;
    },
});

// A lightweight pre-game view for the lobby screen: the room code, mode, seats so the host can
// see who has joined. Does not include hands (none exist yet in lobby phase).
export const lobbyView = query({
    args: { gameId: v.id("games") },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (game === null) return null;
        const seats = await ctx.db
            .query("seats")
            .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
            .collect();
        seats.sort((a, b) => a.position - b.position);
        return {
            gameId: game._id,
            roomCode: game.roomCode,
            phase: game.phase,
            mode: game.mode,
            hostUserId: game.hostUserId,
            seats: seats.map((s) => ({
                position: s.position,
                team: s.team,
                isAI: s.isAI,
                displayName: s.displayName,
                userId: s.userId,
            })),
        };
    },
});

