import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server.js";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// Familiar PR-flavored names for AI fill-ins.
const AI_NAMES: Record<number, string> = { 0: "Tito", 1: "Lefty", 2: "Compa", 3: "Tía Yari" };
const AI_AVATARS: Record<number, string> = { 0: "coffee", 1: "drum", 2: "parrot", 3: "hibiscus" };

function generateRoomCode(): string {
    let out = "";
    for (let i = 0; i < 6; i++) {
        out += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
    }
    return out;
}

// Return the gameId of an active game the user is already in, or null if clear.
// "Active" means lobby | in_round | round_end — not match_end or abandoned.
async function findExistingActiveGame(
    ctx: { db: { query: Function; get: Function } },
    userId: string,
): Promise<string | null> {
    const seats = await ctx.db
        .query("seats")
        .withIndex("by_user", (q: { eq: Function }) => q.eq("userId", userId))
        .collect();
    for (const seat of seats as { gameId: string }[]) {
        const game = await ctx.db.get(seat.gameId);
        if (game === null) continue;
        const phase = (game as { phase: string }).phase;
        if (phase !== "match_end" && phase !== "abandoned") return seat.gameId;
    }
    return null;
}

// Host clicks "Create game". We allocate a unique room code, write the games row in lobby
// phase, and seat the host at position 0 (team A). Sets host's activeGameId.
export const createGame = mutation({
    args: {
        hostUserId: v.id("users"),
        mode: v.union(v.literal("4p-partners"), v.literal("2p"), v.literal("solo-vs-ai")),
        enableTranpas: v.boolean(),
    },
    handler: async (ctx, args) => {
        const host = await ctx.db.get(args.hostUserId);
        if (host === null) throw new ConvexError("Host user not found");

        // Enforce single-game-at-a-time.
        const conflict = await findExistingActiveGame(ctx, args.hostUserId as unknown as string);
        if (conflict !== null) throw new ConvexError("You are already in an active game");

        let roomCode = "";
        for (let attempt = 0; attempt < 10; attempt++) {
            const candidate = generateRoomCode();
            const collision = await ctx.db
                .query("games")
                .withIndex("by_roomCode", (q) => q.eq("roomCode", candidate))
                .unique();
            if (collision === null) {
                roomCode = candidate;
                break;
            }
        }
        if (roomCode === "") throw new ConvexError("Could not allocate a room code");
        const now = Date.now();
        const gameId = await ctx.db.insert("games", {
            roomCode,
            hostUserId: args.hostUserId,
            mode: args.mode,
            phase: "lobby",
            chain: { tiles: [], leftEnd: null, rightEnd: null },
            turnIndex: 0,
            turnNumber: 0,
            round: 0,
            scores: { A: 0, B: 0 },
            options: {
                targetScore: 200,
                capicuaBonus: 25,
                chuchazoBonus: 25,
                mode: args.mode,
                enableTranpas: args.enableTranpas,
            },
            lastOutcome: null,
            createdAt: now,
            updatedAt: now,
        });
        await ctx.db.insert("seats", {
            gameId,
            position: 0,
            userId: args.hostUserId,
            team: "A",
            isAI: false,
            displayName: host.displayName,
            ...(host.avatar !== undefined && { avatar: host.avatar }),
            lastSeenAt: now,
            autoPassCount: 0,
        });
        await ctx.db.patch(args.hostUserId, { activeGameId: gameId });
        return { gameId, roomCode };
    },
});

// Friend pastes a room code (or follows a share link). We look up the game in lobby phase and
// seat the joiner at the next empty position. Team assignment alternates A/B by position.
export const joinByCode = mutation({
    args: { roomCode: v.string(), userId: v.id("users") },
    handler: async (ctx, args) => {
        const game = await ctx.db
            .query("games")
            .withIndex("by_roomCode", (q) => q.eq("roomCode", args.roomCode))
            .unique();
        if (game === null) throw new ConvexError("Game not found");
        if (game.phase !== "lobby") throw new ConvexError("Game already started");

        // Enforce single-game-at-a-time.
        const conflict = await findExistingActiveGame(ctx, args.userId as unknown as string);
        if (conflict !== null) throw new ConvexError("You are already in an active game");

        const user = await ctx.db.get(args.userId);
        if (user === null) throw new ConvexError("User not found");
        const existingSeats = await ctx.db
            .query("seats")
            .withIndex("by_game", (q) => q.eq("gameId", game._id))
            .collect();

        // Don't double-seat the same user.
        if (existingSeats.some((s) => s.userId === args.userId)) {
            return { gameId: game._id, position: existingSeats.find((s) => s.userId === args.userId)!.position };
        }

        const maxSeats = game.mode === "2p" ? 2 : 4;
        const taken = new Set(existingSeats.map((s) => s.position));
        let position: 0 | 1 | 2 | 3 | null = null;
        for (let i = 0; i < maxSeats; i++) {
            if (!taken.has(i as 0 | 1 | 2 | 3)) {
                position = i as 0 | 1 | 2 | 3;
                break;
            }
        }
        if (position === null) throw new ConvexError("Game is full");
        const now = Date.now();
        await ctx.db.insert("seats", {
            gameId: game._id,
            position,
            userId: args.userId,
            team: position % 2 === 0 ? "A" : "B",
            isAI: false,
            displayName: user.displayName,
            ...(user.avatar !== undefined && { avatar: user.avatar }),
            lastSeenAt: now,
            autoPassCount: 0,
        });
        await ctx.db.patch(args.userId, { activeGameId: game._id });
        return { gameId: game._id, position };
    },
});

// Host fills an empty seat with an AI fill-in. Only the host can do this.
export const addAiSeat = mutation({
    args: {
        gameId: v.id("games"),
        callerUserId: v.id("users"),
        position: v.union(v.literal(0), v.literal(1), v.literal(2), v.literal(3)),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (game === null) throw new ConvexError("Game not found");
        if (game.phase !== "lobby") throw new ConvexError("Game already started");
        if (game.hostUserId !== args.callerUserId) {
            throw new ConvexError("Only the host can add AI seats");
        }
        const seats = await ctx.db
            .query("seats")
            .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
            .collect();
        if (seats.some((s) => s.position === args.position)) {
            throw new ConvexError("Position already taken");
        }
        const now = Date.now();
        await ctx.db.insert("seats", {
            gameId: args.gameId,
            position: args.position,
            // userId omitted intentionally — AI seats have no owning user
            team: args.position % 2 === 0 ? "A" : "B",
            isAI: true,
            displayName: AI_NAMES[args.position] ?? "Bot",
            avatar: AI_AVATARS[args.position] ?? "star",
            lastSeenAt: now,
            autoPassCount: 0,
        });
    },
});

// Leave a lobby before the match has started. Clears the user's activeGameId.
// The host leaving with only AI seats remaining deletes the game entirely.
export const leaveLobby = mutation({
    args: { gameId: v.id("games"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (game === null) return;
        if (game.phase !== "lobby") return;
        const mySeat = await ctx.db
            .query("seats")
            .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .unique();
        if (mySeat !== null) await ctx.db.delete(mySeat._id);
        // Clear activeGameId for the leaving user.
        await ctx.db.patch(args.userId, { activeGameId: undefined });
        if (game.hostUserId === args.userId) {
            const remaining = await ctx.db
                .query("seats")
                .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
                .collect();
            if (remaining.every((s) => s.isAI)) {
                for (const s of remaining) await ctx.db.delete(s._id);
                await ctx.db.delete(args.gameId);
            }
        }
    },
});

// startMatch lives in apps/convex/games.ts so the engine import sits next to the other
// engine-using mutations (playTile, passTurn, aiAdvance, startNextRound).
