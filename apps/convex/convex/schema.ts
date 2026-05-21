import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Anonymous-identity model: a user is identified by a stable deviceId stored in localStorage on
// the client. No email, no auth provider in Phase 3. Real auth (magic-link or OAuth) lands in
// Phase 4 when collections need to persist across devices.
export default defineSchema({
    users: defineTable({
        deviceId: v.string(),
        displayName: v.string(),
        avatarUrl: v.optional(v.string()),
        // Avatar is one of the preset ID strings from apps/web/src/ui/avatars.ts (e.g. "coqui").
        // Optional for backwards compat with rows created before this field existed.
        avatar: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_deviceId", ["deviceId"]),

    games: defineTable({
        roomCode: v.string(), // 6-char from the unambiguous alphabet
        hostUserId: v.id("users"),
        mode: v.union(
            v.literal("4p-partners"),
            v.literal("2p"),
            v.literal("solo-vs-ai"),
        ),
        phase: v.union(
            v.literal("lobby"),
            v.literal("in_round"),
            v.literal("round_end"),
            v.literal("match_end"),
            v.literal("abandoned"),
        ),
        // Engine GameState fields (everything except per-player hands)
        chain: v.any(),
        turnIndex: v.number(),
        turnNumber: v.number(),
        round: v.number(),
        scores: v.object({ A: v.number(), B: v.number() }),
        options: v.object({
            targetScore: v.union(v.literal(100), v.literal(150), v.literal(200)),
            capicuaBonus: v.number(),
            chuchazoBonus: v.number(),
            mode: v.string(),
            enableTranpas: v.boolean(),
        }),
        lastActorUserId: v.optional(v.id("users")),
        lastOutcome: v.any(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_roomCode", ["roomCode"])
        .index("by_host", ["hostUserId"]),

    seats: defineTable({
        gameId: v.id("games"),
        position: v.union(v.literal(0), v.literal(1), v.literal(2), v.literal(3)),
        userId: v.optional(v.id("users")), // null for AI fill-ins
        team: v.union(v.literal("A"), v.literal("B")),
        isAI: v.boolean(),
        displayName: v.string(),
        // Snapshot of the user's avatar at join time (so it follows the seat even if the user
        // later changes their default).
        avatar: v.optional(v.string()),
        lastSeenAt: v.number(),
        autoPassCount: v.number(),
    })
        .index("by_game", ["gameId"])
        .index("by_game_position", ["gameId", "position"])
        .index("by_user", ["userId"]),

    // PRIVATE table — never exposed to clients other than the owner of the seat.
    playerHands: defineTable({
        gameId: v.id("games"),
        seatPosition: v.union(v.literal(0), v.literal(1), v.literal(2), v.literal(3)),
        userId: v.optional(v.id("users")),
        // Tile[] serialized as [a,b] pairs.
        tiles: v.array(v.array(v.number())),
    }).index("by_game_seat", ["gameId", "seatPosition"]),

    history: defineTable({
        gameId: v.id("games"),
        turnNumber: v.number(),
        // HistoryEntry: Move | StealEvent | StealSkipped (engine type)
        entry: v.any(),
        createdAt: v.number(),
    }).index("by_game", ["gameId"]),

    // Audit log for steal RNG. Retained 48h via the cleanupStealAudit scheduled function.
    stealAudit: defineTable({
        gameId: v.id("games"),
        turnNumber: v.number(),
        sourceSeatPosition: v.number(),
        targetSeatPosition: v.number(),
        // The actual stolen tile [a,b]
        stolenTile: v.array(v.number()),
        // The float drawn from the RNG before flooring to an index (for dispute reconstruction).
        rngDraw: v.number(),
        createdAt: v.number(),
    }).index("by_game", ["gameId"]),
});
