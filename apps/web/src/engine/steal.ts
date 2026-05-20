import type {
    GameState,
    Hand,
    PlayerId,
    Rng,
    StealEvent,
    StealSkipped,
    StealSkippedReason,
    Tile,
} from "./types.js";

type StealDecision =
    | { proceed: true; sourcePlayerId: PlayerId; targetPlayerId: PlayerId }
    | {
          proceed: false;
          reason: StealSkippedReason | null;
          sourcePlayerId: PlayerId | null;
          targetPlayerId: PlayerId | null;
      };

// Determines whether the post-move steal phase should proceed, skip with a logged reason, or be silently no-op'd.
export function shouldSteal(state: GameState): StealDecision {
    const targetSeat = state.seats[state.turnIndex];
    if (state.lastActorPlayerId === null || targetSeat === undefined) {
        return { proceed: false, reason: null, sourcePlayerId: null, targetPlayerId: null };
    }
    const sourcePlayerId = state.lastActorPlayerId;
    const targetPlayerId = targetSeat.playerId;

    const sourceHand: Hand | undefined = state.hands[sourcePlayerId as unknown as string];
    const sourceLen = sourceHand?.length ?? 0;

    if (sourceLen === 0) {
        return { proceed: false, reason: "source-won-round", sourcePlayerId, targetPlayerId };
    }
    if (sourceLen === 1) {
        return { proceed: false, reason: "immunity", sourcePlayerId, targetPlayerId };
    }
    if (state.round >= 2 && state.chain.tiles.length === 1) {
        return { proceed: false, reason: "first-move-of-round", sourcePlayerId, targetPlayerId };
    }
    return { proceed: true, sourcePlayerId, targetPlayerId };
}

// Resolves the post-move steal phase: either transfers a random tile from source to target, or appends a skip entry, or no-ops on degenerate state.
export function resolveStealPhase(state: GameState, rng: Rng): GameState {
    const decision = shouldSteal(state);

    if (!decision.proceed) {
        // Degenerate state: no actor or no target. Nothing to log.
        if (decision.reason === null || decision.sourcePlayerId === null || decision.targetPlayerId === null) {
            return state;
        }
        const skipEntry: StealSkipped = {
            kind: "steal-skipped",
            fromPlayerId: decision.sourcePlayerId,
            toPlayerId: decision.targetPlayerId,
            reason: decision.reason,
            turnNumber: state.turnNumber,
        };
        return {
            ...state,
            history: [...state.history, skipEntry],
        };
    }

    const sourceHand = state.hands[decision.sourcePlayerId as unknown as string];
    const targetHand = state.hands[decision.targetPlayerId as unknown as string];
    if (sourceHand === undefined || sourceHand.length === 0) return state;
    if (targetHand === undefined) return state;

    // Pick a random index. Clamp defensively in case rng() somehow returns exactly 1.
    const raw = rng();
    const idx = Math.min(Math.floor(raw * sourceHand.length), sourceHand.length - 1);
    const stolenTile: Tile | undefined = sourceHand[idx];
    if (stolenTile === undefined) return state;

    const newSourceHand: Hand = [
        ...sourceHand.slice(0, idx),
        ...sourceHand.slice(idx + 1),
    ];
    const newTargetHand: Hand = [...targetHand, stolenTile];

    const newHands: Record<string, Hand> = { ...state.hands };
    newHands[decision.sourcePlayerId as unknown as string] = newSourceHand;
    newHands[decision.targetPlayerId as unknown as string] = newTargetHand;

    const stealEvent: StealEvent = {
        kind: "steal",
        fromPlayerId: decision.sourcePlayerId,
        toPlayerId: decision.targetPlayerId,
        stolenTile,
        turnNumber: state.turnNumber,
    };

    return {
        ...state,
        hands: newHands,
        history: [...state.history, stealEvent],
    };
}
