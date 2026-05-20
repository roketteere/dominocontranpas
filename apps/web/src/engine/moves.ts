import type {
    Chain,
    GameState,
    Hand,
    Move,
    PassMove,
    PlacedTile,
    PlayMove,
    PlayerId,
    Side,
    Tile,
} from "./types.js";
import { containsTile, equals, removeTile, tile as makeTile } from "./tiles.js";

// Internal: compute the new chain after placing `tile` on the given `side`. Caller has validated the move.
function placeTileOnChain(
    chain: Chain,
    incoming: Tile,
    side: Side,
    playerId: PlayerId,
    turnNumber: number,
): Chain {
    // Opening move: chain has no tiles yet. Place tile as-is, leftEnd = tile[0], rightEnd = tile[1].
    if (chain.tiles.length === 0) {
        const placed: PlacedTile = {
            tile: incoming,
            leftPip: incoming[0],
            rightPip: incoming[1],
            playedBy: playerId,
            turnNumber,
        };
        return {
            tiles: [placed],
            leftEnd: incoming[0],
            rightEnd: incoming[1],
        };
    }

    if (side === "left") {
        const leftEnd = chain.leftEnd;
        // The incoming tile's matching pip becomes the new PlacedTile's rightPip (faces inward).
        // The other pip becomes its leftPip and the new chain.leftEnd.
        let matching: typeof incoming[0];
        let exposed: typeof incoming[0];
        if (incoming[0] === leftEnd) {
            matching = incoming[0];
            exposed = incoming[1];
        } else {
            matching = incoming[1];
            exposed = incoming[0];
        }
        const placed: PlacedTile = {
            tile: incoming,
            leftPip: exposed,
            rightPip: matching,
            playedBy: playerId,
            turnNumber,
        };
        return {
            tiles: [placed, ...chain.tiles],
            leftEnd: exposed,
            rightEnd: chain.rightEnd,
        };
    }

    // side === "right"
    const rightEnd = chain.rightEnd;
    let matching: typeof incoming[0];
    let exposed: typeof incoming[0];
    if (incoming[0] === rightEnd) {
        matching = incoming[0];
        exposed = incoming[1];
    } else {
        matching = incoming[1];
        exposed = incoming[0];
    }
    const placed: PlacedTile = {
        tile: incoming,
        leftPip: matching,
        rightPip: exposed,
        playedBy: playerId,
        turnNumber,
    };
    return {
        tiles: [...chain.tiles, placed],
        leftEnd: chain.leftEnd,
        rightEnd: exposed,
    };
}

// Internal: look up the hand for a player. Returns undefined if the player has no seat.
function getHand(state: GameState, playerId: PlayerId): Hand | undefined {
    return state.hands[playerId as unknown as string];
}

// Returns the list of legal moves for the given player at the current state.
export function validMoves(state: GameState, playerId: PlayerId): Move[] {
    if (state.phase !== "in_round") return [];
    const currentSeat = state.seats[state.turnIndex];
    if (currentSeat === undefined) return [];
    if (currentSeat.playerId !== playerId) return [];

    const hand = getHand(state, playerId);
    if (hand === undefined || hand.length === 0) return [];

    // Opening move of the chain.
    if (state.chain.tiles.length === 0) {
        if (state.round === 1) {
            const doubleSix = makeTile(6, 6);
            if (containsTile(hand, doubleSix)) {
                return [{ kind: "play", playerId, tile: doubleSix, side: "left" }];
            }
            return [];
        }
        // Subsequent rounds: any tile is legal as the opening move.
        return hand.map((t) => ({ kind: "play", playerId, tile: t, side: "left" }));
    }

    // Mid-round: match against either chain end.
    const moves: PlayMove[] = [];
    const leftEnd = state.chain.leftEnd;
    const rightEnd = state.chain.rightEnd;

    for (const t of hand) {
        if (leftEnd !== null && (t[0] === leftEnd || t[1] === leftEnd)) {
            moves.push({ kind: "play", playerId, tile: t, side: "left" });
        }
        if (rightEnd !== null && (t[0] === rightEnd || t[1] === rightEnd)) {
            moves.push({ kind: "play", playerId, tile: t, side: "right" });
        }
    }

    if (moves.length === 0) {
        const pass: PassMove = { kind: "pass", playerId };
        return [pass];
    }
    return moves;
}

// Applies a move to the state and returns the resulting GameState. Throws if the move is illegal.
export function applyMove(state: GameState, move: Move): GameState {
    const legal = validMoves(state, move.playerId);
    const isMatch = legal.some((candidate) => {
        if (candidate.kind !== move.kind) return false;
        if (candidate.playerId !== move.playerId) return false;
        if (candidate.kind === "pass") return true;
        // candidate.kind === "play" && move.kind === "play"
        const playMove = move as PlayMove;
        return candidate.side === playMove.side && equals(candidate.tile, playMove.tile);
    });
    if (!isMatch) {
        throw new Error("Illegal move");
    }

    const nextTurnIndex = (state.turnIndex + 1) % state.seats.length;
    const nextTurnNumber = state.turnNumber + 1;

    if (move.kind === "pass") {
        return {
            ...state,
            history: [...state.history, move],
            turnIndex: nextTurnIndex,
            turnNumber: nextTurnNumber,
            lastActorPlayerId: move.playerId,
        };
    }

    // Play move.
    const hand = getHand(state, move.playerId);
    /* c8 ignore next 3 -- validMoves filters out players without hands; this is a TS-required guard */
    if (hand === undefined) {
        throw new Error("Player has no hand: " + String(move.playerId));
    }
    const newHand = removeTile(hand, move.tile);
    const newChain = placeTileOnChain(state.chain, move.tile, move.side, move.playerId, state.turnNumber);

    const newHands: Record<string, Hand> = { ...state.hands };
    newHands[move.playerId as unknown as string] = newHand;

    return {
        ...state,
        hands: newHands,
        chain: newChain,
        history: [...state.history, move],
        turnIndex: nextTurnIndex,
        turnNumber: nextTurnNumber,
        lastActorPlayerId: move.playerId,
    };
}
