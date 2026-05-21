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
        // Short human-readable code for adding friends, generated once at account creation.
        friendCode: v.optional(v.string()),
        // Separate from friendCode — entering it on a new device re-keys this user row to the
        // new deviceId, effectively "moving" the account. Backfilled lazily by createOrGetUser.
        recoveryCode: v.optional(v.string()),
        // Owner flag. Set once via claimOwnership() with the OWNER_SECRET env var.
        // Owners can call adminListUsers to see everyone's recovery code (so Joel can help
        // friends/family who lose theirs). Optional defaults to falsy.
        isOwner: v.optional(v.boolean()),
        // The single game this user is currently seated in (lobby → match_end). Cleared on
        // match_end so only truly active games count. One game at a time enforced on join.
        activeGameId: v.optional(v.id("games")),
        createdAt: v.number(),
    })
        .index("by_deviceId", ["deviceId"])
        .index("by_friendCode", ["friendCode"])
        .index("by_recoveryCode", ["recoveryCode"]),

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
        // Server-secret boneyard. Tiles not initially dealt, drawn from when a player is stuck.
        // Empty in 4p-partners; 14 tiles in 2p. NEVER exposed to clients — views.ts surfaces only
        // a length count (boneyardCount). Optional for backwards compat with rows created before
        // this field existed; assembleState defaults missing → [].
        boneyard: v.optional(v.array(v.array(v.number()))),
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

    // Directed friendship graph. A pair (A→B) with status "pending" means A sent B a request.
    // Once accepted, both directions are treated as friends — query by_requester + by_addressee.
    friendships: defineTable({
        requesterId: v.id("users"),
        addresseeId: v.id("users"),
        status: v.union(v.literal("pending"), v.literal("accepted")),
        createdAt: v.number(),
    })
        .index("by_requester", ["requesterId"])
        .index("by_addressee", ["addresseeId"])
        .index("by_pair", ["requesterId", "addresseeId"]),

    // In-lobby invites. The toUser sees a notification; accepting navigates to join-game.
    // Stale invites (game left lobby) are filtered client-side.
    gameInvites: defineTable({
        gameId: v.id("games"),
        fromUserId: v.id("users"),
        toUserId: v.id("users"),
        status: v.union(
            v.literal("pending"),
            v.literal("accepted"),
            v.literal("declined"),
            v.literal("expired"),
        ),
        createdAt: v.number(),
    })
        .index("by_game", ["gameId"])
        .index("by_to_user", ["toUserId", "status"])
        .index("by_from_user", ["fromUserId"]),

    // Per-user lifetime match statistics. Upserted at match_end by recordMatchStats.
    userStats: defineTable({
        userId: v.id("users"),
        wins: v.number(),
        losses: v.number(),
        gamesPlayed: v.number(),
        totalPoints: v.number(),
        capicuaWins: v.number(),
        chuchazoWins: v.number(),
        stealCount: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_wins", ["wins"]),
});
