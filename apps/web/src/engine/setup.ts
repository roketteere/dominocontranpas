import type {
    GameMode,
    GameOptions,
    GameState,
    Hand,
    PlayerSeat,
    Rng,
    Scores,
    SeatPosition,
    TeamId,
    Tile,
} from "./types.js";
import { allDoubleSixTiles, containsTile, tile as makeTile } from "./tiles.js";

// Default game options for a new match.
export function defaultGameOptions(mode: GameMode = "4p-partners"): GameOptions {
    return {
        targetScore: 200,
        capicuaBonus: 25,
        chuchazoBonus: 25,
        mode,
    };
}

// Construct seats for the canonical 4-player partners layout. Positions 0,2 = team A; 1,3 = team B.
export function fourPartnerSeats(
    names: readonly [string, string, string, string],
    aiFlags: readonly [boolean, boolean, boolean, boolean],
): readonly PlayerSeat[] {
    return names.map((displayName, i): PlayerSeat => {
        const position = i as SeatPosition;
        const team: TeamId = position % 2 === 0 ? "A" : "B";
        return {
            playerId: `seat-${i}` as unknown as PlayerSeat["playerId"],
            position,
            team,
            isAI: aiFlags[i] ?? false,
            displayName,
        };
    });
}

// Construct an empty (pre-deal) GameState ready for the first round.
export function initialGameState(
    seats: readonly PlayerSeat[],
    options: GameOptions,
): GameState {
    const hands: Record<string, Hand> = {};
    for (const s of seats) hands[s.playerId as unknown as string] = [];
    const scores: Scores = { A: 0, B: 0 };
    return {
        phase: "lobby",
        seats,
        hands,
        chain: { tiles: [], leftEnd: null, rightEnd: null },
        turnIndex: 0,
        turnNumber: 0,
        scores,
        round: 0,
        options,
        history: [],
        lastActorPlayerId: null,
        lastOutcome: null,
    };
}

// Fisher-Yates shuffle with injected RNG. Returns a new array.
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

// Deal a fresh round. For 4p: 7 tiles to each seat, 0 dead. For 2p: 7 each, 14 dead. The opener:
//   - Round 1: holder of [6,6]
//   - Round 2+: winner of previous round, identified by previousWinnerSeatIndex (caller's responsibility)
//   On the very first round when previousWinnerSeatIndex is null, we find the [6,6] holder.
export function dealRound(
    state: GameState,
    rng: Rng,
    previousWinnerSeatIndex: number | null,
): GameState {
    const isTwoPlayer = state.options.mode === "2p";
    const tilesPerHand = 7;
    const seatsCount = isTwoPlayer ? 2 : state.seats.length;

    const shuffled = shuffle(allDoubleSixTiles(), rng);
    const newHands: Record<string, Hand> = {};
    let cursor = 0;
    for (let i = 0; i < seatsCount; i++) {
        const seat = state.seats[i];
        if (seat === undefined) continue;
        const slice: Tile[] = shuffled.slice(cursor, cursor + tilesPerHand);
        newHands[seat.playerId as unknown as string] = slice;
        cursor += tilesPerHand;
    }
    // Initialize empty hands for any unused seats (shouldn't happen in 4p, only in 2p mode).
    for (let i = seatsCount; i < state.seats.length; i++) {
        const seat = state.seats[i];
        if (seat === undefined) continue;
        newHands[seat.playerId as unknown as string] = [];
    }

    // Find the opener.
    const newRound = state.round + 1;
    let openerIndex = 0;
    if (newRound === 1) {
        const doubleSix = makeTile(6, 6);
        for (let i = 0; i < state.seats.length; i++) {
            const seat = state.seats[i];
            if (seat === undefined) continue;
            const hand = newHands[seat.playerId as unknown as string];
            if (hand !== undefined && containsTile(hand, doubleSix)) {
                openerIndex = i;
                break;
            }
        }
    } else if (previousWinnerSeatIndex !== null) {
        openerIndex = previousWinnerSeatIndex;
    }

    return {
        ...state,
        phase: "in_round",
        hands: newHands,
        chain: { tiles: [], leftEnd: null, rightEnd: null },
        turnIndex: openerIndex,
        turnNumber: 0,
        round: newRound,
        history: [],
        lastActorPlayerId: null,
        lastOutcome: null,
    };
}

// Build an Rng from crypto.getRandomValues (browser/server). Each call returns a fresh [0,1) float.
export function cryptoRng(): Rng {
    return () => {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        // Divide by 2^32 to get [0, 1).
        return (buf[0] ?? 0) / 0x100000000;
    };
}

// Deterministic seeded RNG for tests and replays (mulberry32).
export function seededRng(seed: number): Rng {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
    };
}
