import { v, ConvexError } from "convex/values";
import { mutation, internalMutation } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import { internal } from "./_generated/api.js";
import { applyMove, validMoves } from "../web/src/engine/moves.js";
import {
    applyRoundOutcome,
    computeRoundOutcome,
    isRoundOver,
    isMatchOver,
} from "../web/src/engine/scoring.js";
import { resolveStealPhase } from "../web/src/engine/steal.js";
import {
    allDoubleSixTiles,
    containsTile,
    tile as makeTile,
} from "../web/src/engine/tiles.js";
import { chooseAiMove } from "../web/src/ai/heuristicAi.js";
import type {
    GameState,
    Hand,
    HistoryEntry,
    Move,
    PlayerId,
    PlayerSeat,
    Rng,
    Tile,
} from "../web/src/engine/types.js";

// ─── helpers ──────────────────────────────────────────────────────────────────────────────────

// The engine identifies players by a branded PlayerId string. On the server we map seat position
// to a stable engine-side id, e.g. "seat-0". This decouples engine logic from Convex Id<"users">.
function seatPid(position: number): PlayerId {
    return `seat-${position}` as unknown as PlayerId;
}

function deserializeHand(rawTiles: number[][]): Hand {
    return rawTiles.map((t) => makeTile(t[0] ?? 0, t[1] ?? 0));
}

function serializeHand(hand: Hand): number[][] {
    return hand.map((t) => [t[0], t[1]]);
}

// Server-side RNG. Convex's V8 runtime exposes Web Crypto globally; declare it locally so
// TypeScript can see it without pulling in the DOM lib.
declare const crypto: {
    getRandomValues<T extends ArrayBufferView>(array: T): T;
};
function serverRng(): Rng {
    return () => {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return (buf[0] ?? 0) / 0x100000000;
    };
}

// Fisher-Yates shuffle bound to an RNG.
function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const a = out[i];
        const b = out[j];
        if (a === undefined || b === undefined) continue;
        out[i] = b;
        out[j] = a;
    }
    return out;
}

// Assemble the engine's GameState from Convex tables for the current game state.
// History rows are pulled in turnNumber order. Only history for the CURRENT round is kept on
// disk (we delete history rows on round transitions).
async function assembleState(
    ctx: { db: { get: Function; query: Function } },
    gameId: Id<"games">,
): Promise<GameState> {
    const game = await ctx.db.get(gameId);
    if (game === null) throw new ConvexError("Game not found");
    const seats = await ctx.db
        .query("seats")
        .withIndex("by_game", (q: { eq: Function }) => q.eq("gameId", gameId))
        .collect();
    seats.sort((a: { position: number }, b: { position: number }) => a.position - b.position);
    const handsArray = await ctx.db
        .query("playerHands")
        .withIndex("by_game_seat", (q: { eq: Function }) => q.eq("gameId", gameId))
        .collect();
    const hands: Record<string, Hand> = {};
    for (const h of handsArray as { seatPosition: number; tiles: number[][] }[]) {
        hands[seatPid(h.seatPosition) as unknown as string] = deserializeHand(h.tiles);
    }
    const history = await ctx.db
        .query("history")
        .withIndex("by_game", (q: { eq: Function }) => q.eq("gameId", gameId))
        .collect();
    history.sort(
        (a: { turnNumber: number }, b: { turnNumber: number }) => a.turnNumber - b.turnNumber,
    );

    const engineSeats: PlayerSeat[] = seats.map(
        (s: {
            position: number;
            team: "A" | "B";
            isAI: boolean;
            displayName: string;
        }) => ({
            playerId: seatPid(s.position),
            position: s.position as 0 | 1 | 2 | 3,
            team: s.team,
            isAI: s.isAI,
            displayName: s.displayName,
        }),
    );

    return {
        phase: game.phase,
        seats: engineSeats,
        hands,
        chain: game.chain,
        turnIndex: game.turnIndex,
        turnNumber: game.turnNumber,
        scores: game.scores,
        round: game.round,
        options: game.options,
        history: history.map((h: { entry: HistoryEntry }) => h.entry),
        lastActorPlayerId: game.lastActorUserId ? null : null, // engine uses string ids, not Convex ids; we keep null on assemble
        lastOutcome: game.lastOutcome,
    };
}

// Persist post-engine state back into Convex tables. Updates the games row, replaces any changed
// playerHands rows, appends new history entries (diff against pre-engine history length), and
// writes the steal audit row if a steal occurred during this turn.
async function persistState(
    ctx: { db: { patch: Function; insert: Function; query: Function; delete: Function } },
    gameId: Id<"games">,
    preHistoryLen: number,
    newState: GameState,
    rngDrawForSteal: number | null,
): Promise<void> {
    const now = Date.now();
    // Update games row.
    await ctx.db.patch(gameId, {
        phase: newState.phase,
        chain: newState.chain,
        turnIndex: newState.turnIndex,
        turnNumber: newState.turnNumber,
        scores: newState.scores,
        round: newState.round,
        lastOutcome: newState.lastOutcome,
        updatedAt: now,
    });

    // Replace hands rows that changed. We re-fetch existing rows and overwrite tiles.
    const handsRows = await ctx.db
        .query("playerHands")
        .withIndex("by_game_seat", (q: { eq: Function }) => q.eq("gameId", gameId))
        .collect();
    for (const row of handsRows as {
        _id: Id<"playerHands">;
        seatPosition: number;
    }[]) {
        const pid = seatPid(row.seatPosition) as unknown as string;
        const engineHand = newState.hands[pid];
        if (engineHand === undefined) continue;
        await ctx.db.patch(row._id, { tiles: serializeHand(engineHand) });
    }

    // Append new history entries (the engine returned a longer history than we had before).
    for (let i = preHistoryLen; i < newState.history.length; i++) {
        const entry = newState.history[i];
        if (entry === undefined) continue;
        await ctx.db.insert("history", {
            gameId,
            turnNumber: i,
            entry,
            createdAt: now,
        });
        // If the new entry is a steal, mirror it to the stealAudit table.
        if (entry.kind === "steal" && rngDrawForSteal !== null) {
            // Extract seat positions from the engine PlayerId strings.
            const fromPos = Number(String(entry.fromPlayerId).replace("seat-", ""));
            const toPos = Number(String(entry.toPlayerId).replace("seat-", ""));
            await ctx.db.insert("stealAudit", {
                gameId,
                turnNumber: newState.turnNumber,
                sourceSeatPosition: fromPos,
                targetSeatPosition: toPos,
                stolenTile: [entry.stolenTile[0], entry.stolenTile[1]],
                rngDraw: rngDrawForSteal,
                createdAt: now,
            });
        }
    }
}

// Capture the next rng() draw so we can audit-log it after the engine's steal phase runs.
function captureRng(rng: Rng): { rng: Rng; lastDraw: () => number | null } {
    let last: number | null = null;
    const wrapped: Rng = () => {
        const v = rng();
        last = v;
        return v;
    };
    return { rng: wrapped, lastDraw: () => last };
}

// Clear all history rows for a game (used between rounds).
async function clearHistory(
    ctx: { db: { query: Function; delete: Function } },
    gameId: Id<"games">,
): Promise<void> {
    const rows = await ctx.db
        .query("history")
        .withIndex("by_game", (q: { eq: Function }) => q.eq("gameId", gameId))
        .collect();
    for (const row of rows as { _id: Id<"history"> }[]) {
        await ctx.db.delete(row._id);
    }
}

// After a turn resolves, if the next seat is AI, schedule an aiAdvance internal mutation.
async function scheduleAiIfNeeded(
    ctx: {
        scheduler: { runAfter: Function };
        db: { query: Function };
    },
    gameId: Id<"games">,
    nextTurnIndex: number,
): Promise<void> {
    const seats = await ctx.db
        .query("seats")
        .withIndex("by_game_position", (q: { eq: Function }) =>
            q.eq("gameId", gameId).eq("position", nextTurnIndex),
        )
        .collect();
    const next = seats[0] as { isAI: boolean } | undefined;
    if (next !== undefined && next.isAI) {
        await ctx.scheduler.runAfter(700, internal.games.aiAdvance, { gameId });
    }
}

// ─── mutations ────────────────────────────────────────────────────────────────────────────────

// Host clicks "Start match". Validates seat counts, deals tiles, sets the round-1 opener to the
// holder of [6,6], and transitions phase to in_round.
export const startMatch = mutation({
    args: { gameId: v.id("games"), callerUserId: v.id("users") },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (game === null) throw new ConvexError("Game not found");
        if (game.phase !== "lobby") throw new ConvexError("Game already started");
        if (game.hostUserId !== args.callerUserId) {
            throw new ConvexError("Only the host can start the match");
        }
        const seats = await ctx.db
            .query("seats")
            .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
            .collect();
        const requiredSeats = game.mode === "2p" ? 2 : 4;
        if (seats.length !== requiredSeats) {
            throw new ConvexError(
                `Need ${requiredSeats} seats, currently have ${seats.length}`,
            );
        }
        seats.sort((a, b) => a.position - b.position);

        // Shuffle the full 28-tile set.
        const rng = serverRng();
        const shuffled = shuffle(allDoubleSixTiles(), rng);

        // Deal 7 tiles to each seat in position order. Any remaining tiles are dead.
        let openerPosition = 0;
        const doubleSix = makeTile(6, 6);
        let cursor = 0;
        for (let i = 0; i < seats.length; i++) {
            const seat = seats[i]!;
            const tiles: Tile[] = shuffled.slice(cursor, cursor + 7);
            cursor += 7;
            await ctx.db.insert("playerHands", {
                gameId: args.gameId,
                seatPosition: seat.position,
                ...(seat.userId !== undefined && { userId: seat.userId }),
                tiles: serializeHand(tiles),
            });
            if (containsTile(tiles, doubleSix)) openerPosition = seat.position;
        }

        const now = Date.now();
        await ctx.db.patch(args.gameId, {
            phase: "in_round",
            round: 1,
            turnIndex: openerPosition,
            turnNumber: 0,
            chain: { tiles: [], leftEnd: null, rightEnd: null },
            updatedAt: now,
        });

        // If the round-1 opener is an AI, kick off the AI advance loop.
        const openerSeat = seats.find((s) => s.position === openerPosition);
        if (openerSeat !== undefined && openerSeat.isAI) {
            await ctx.scheduler.runAfter(700, internal.games.aiAdvance, { gameId: args.gameId });
        }
    },
});

// Apply a play move from the caller, then resolve the steal phase, then either schedule the next
// AI advance or transition to round_end/match_end. The engine is the source of truth.
export const playTile = mutation({
    args: {
        gameId: v.id("games"),
        userId: v.id("users"),
        tile: v.array(v.number()),
        side: v.union(v.literal("left"), v.literal("right")),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (game === null) throw new ConvexError("Game not found");
        if (game.phase !== "in_round") throw new ConvexError("Game is not in round");

        // Find caller's seat.
        const seats = await ctx.db
            .query("seats")
            .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
            .collect();
        const mySeat = seats.find((s) => s.userId === args.userId);
        if (mySeat === undefined) throw new ConvexError("Not seated in this game");
        if (mySeat.position !== game.turnIndex) {
            throw new ConvexError("Not your turn");
        }

        const state = await assembleState(ctx, args.gameId);
        const tile = makeTile(args.tile[0] ?? 0, args.tile[1] ?? 0);
        const move: Move = {
            kind: "play",
            playerId: seatPid(mySeat.position),
            tile,
            side: args.side,
        };
        const preHistoryLen = state.history.length;

        let afterMove: GameState;
        try {
            afterMove = applyMove(state, move);
        } catch (e) {
            throw new ConvexError(e instanceof Error ? e.message : "Illegal move");
        }

        const { rng, lastDraw } = captureRng(serverRng());
        const afterSteal = resolveStealPhase(afterMove, rng);
        const rngDraw = lastDraw();

        await persistState(ctx, args.gameId, preHistoryLen, afterSteal, rngDraw);

        // Bump seat heartbeat.
        await ctx.db.patch(mySeat._id, { lastSeenAt: Date.now(), autoPassCount: 0 });

        await finalizeAfterMove(ctx, args.gameId, afterSteal);
    },
});

// Pass when the caller has no legal play.
export const passTurn = mutation({
    args: { gameId: v.id("games"), userId: v.id("users") },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (game === null) throw new ConvexError("Game not found");
        if (game.phase !== "in_round") throw new ConvexError("Game is not in round");

        const seats = await ctx.db
            .query("seats")
            .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
            .collect();
        const mySeat = seats.find((s) => s.userId === args.userId);
        if (mySeat === undefined) throw new ConvexError("Not seated in this game");
        if (mySeat.position !== game.turnIndex) throw new ConvexError("Not your turn");

        const state = await assembleState(ctx, args.gameId);
        const move: Move = { kind: "pass", playerId: seatPid(mySeat.position) };
        const preHistoryLen = state.history.length;

        let afterMove: GameState;
        try {
            afterMove = applyMove(state, move);
        } catch (e) {
            throw new ConvexError(e instanceof Error ? e.message : "Illegal pass");
        }

        const { rng, lastDraw } = captureRng(serverRng());
        const afterSteal = resolveStealPhase(afterMove, rng);
        const rngDraw = lastDraw();

        await persistState(ctx, args.gameId, preHistoryLen, afterSteal, rngDraw);
        await ctx.db.patch(mySeat._id, { lastSeenAt: Date.now(), autoPassCount: 0 });
        await finalizeAfterMove(ctx, args.gameId, afterSteal);
    },
});

// Internal mutation: an AI seat takes its turn. Scheduled from playTile/passTurn/startMatch.
export const aiAdvance = internalMutation({
    args: { gameId: v.id("games") },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (game === null) return;
        if (game.phase !== "in_round") return;
        const seats = await ctx.db
            .query("seats")
            .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
            .collect();
        const currentSeat = seats.find((s) => s.position === game.turnIndex);
        if (currentSeat === undefined) return;
        if (!currentSeat.isAI) return;

        const state = await assembleState(ctx, args.gameId);
        const playerId = seatPid(currentSeat.position);
        const move = chooseAiMove(state, playerId);
        const preHistoryLen = state.history.length;

        const afterMove = applyMove(state, move);
        const { rng, lastDraw } = captureRng(serverRng());
        const afterSteal = resolveStealPhase(afterMove, rng);
        const rngDraw = lastDraw();

        await persistState(ctx, args.gameId, preHistoryLen, afterSteal, rngDraw);
        await ctx.db.patch(currentSeat._id, { lastSeenAt: Date.now() });
        await finalizeAfterMove(ctx, args.gameId, afterSteal);
    },
});

// Host-only: deal a new round after a round_end. The opener is a member of the winning team.
export const startNextRound = mutation({
    args: { gameId: v.id("games"), callerUserId: v.id("users") },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (game === null) throw new ConvexError("Game not found");
        if (game.phase !== "round_end") throw new ConvexError("Round is not over");
        if (game.hostUserId !== args.callerUserId) {
            throw new ConvexError("Only the host can start the next round");
        }
        const seats = await ctx.db
            .query("seats")
            .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
            .collect();
        seats.sort((a, b) => a.position - b.position);

        // Opener: any seat on the winning team (default to lowest position).
        let openerPosition = 0;
        const last = game.lastOutcome as { winningTeam?: "A" | "B" } | null;
        if (last !== null && last.winningTeam !== undefined) {
            const opener = seats.find((s) => s.team === last.winningTeam);
            if (opener !== undefined) openerPosition = opener.position;
        }

        // Re-deal.
        const rng = serverRng();
        const shuffled = shuffle(allDoubleSixTiles(), rng);
        let cursor = 0;
        const handsRows = await ctx.db
            .query("playerHands")
            .withIndex("by_game_seat", (q) => q.eq("gameId", args.gameId))
            .collect();
        for (const seat of seats) {
            const tiles: Tile[] = shuffled.slice(cursor, cursor + 7);
            cursor += 7;
            const existingRow = handsRows.find((h) => h.seatPosition === seat.position);
            if (existingRow !== undefined) {
                await ctx.db.patch(existingRow._id, { tiles: serializeHand(tiles) });
            } else {
                await ctx.db.insert("playerHands", {
                    gameId: args.gameId,
                    seatPosition: seat.position,
                    ...(seat.userId !== undefined && { userId: seat.userId }),
                    tiles: serializeHand(tiles),
                });
            }
        }

        await clearHistory(ctx, args.gameId);
        await ctx.db.patch(args.gameId, {
            phase: "in_round",
            round: game.round + 1,
            turnIndex: openerPosition,
            turnNumber: 0,
            chain: { tiles: [], leftEnd: null, rightEnd: null },
            lastOutcome: null,
            updatedAt: Date.now(),
        });

        const openerSeat = seats.find((s) => s.position === openerPosition);
        if (openerSeat !== undefined && openerSeat.isAI) {
            await ctx.scheduler.runAfter(700, internal.games.aiAdvance, { gameId: args.gameId });
        }
    },
});

// Internal helper: after a move resolves, check round-end + match-end transitions and either
// schedule the next AI turn or do nothing (waiting on a human).
async function finalizeAfterMove(
    ctx: {
        db: { patch: Function; query: Function };
        scheduler: { runAfter: Function };
    },
    gameId: Id<"games">,
    afterSteal: GameState,
): Promise<void> {
    if (isRoundOver(afterSteal)) {
        const outcome = computeRoundOutcome(afterSteal);
        if (outcome !== null) {
            const afterOutcome = applyRoundOutcome(afterSteal, outcome);
            const matchOver = isMatchOver(afterOutcome);
            await ctx.db.patch(gameId, {
                phase: matchOver ? "match_end" : "round_end",
                scores: afterOutcome.scores,
                lastOutcome: outcome,
                updatedAt: Date.now(),
            });
        }
        return;
    }
    await scheduleAiIfNeeded(ctx, gameId, afterSteal.turnIndex);
}
