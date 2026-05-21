import { describe, expect, it } from "vitest";
import type {
    Chain,
    GameOptions,
    GameState,
    Hand,
    Move,
    PassMove,
    PlayMove,
    PlayerId,
    Rng,
    Scores,
    Tile,
} from "./types.js";
import {
    allDoubleSixTiles,
    containsTile,
    equals,
    handPips,
    isDouble,
    pips,
    removeTile,
    tile as makeTile,
    tileFromString,
    tileToString,
} from "./tiles.js";
import { applyMove, validMoves } from "./moves.js";
import {
    applyRoundOutcome,
    computeRoundOutcome,
    isMatchOver,
    isRoundOver,
    isZapato,
} from "./scoring.js";
import { resolveStealPhase, shouldSteal } from "./steal.js";

// ───────── helpers ─────────

function pid(s: string): PlayerId {
    return s as unknown as PlayerId;
}

function emptyChain(): Chain {
    return { tiles: [], leftEnd: null, rightEnd: null };
}

function defaultOptions(): GameOptions {
    return {
        targetScore: 200,
        capicuaBonus: 25,
        chuchazoBonus: 25,
        mode: "4p-partners",
        enableTranpas: true,
    };
}

function defaultScores(): Scores {
    return { A: 0, B: 0 };
}

function fourPlayerState(overrides: Partial<GameState> = {}): GameState {
    const seats = [
        { playerId: pid("p0"), position: 0 as const, team: "A" as const, isAI: false, displayName: "P0" },
        { playerId: pid("p1"), position: 1 as const, team: "B" as const, isAI: false, displayName: "P1" },
        { playerId: pid("p2"), position: 2 as const, team: "A" as const, isAI: false, displayName: "P2" },
        { playerId: pid("p3"), position: 3 as const, team: "B" as const, isAI: false, displayName: "P3" },
    ];
    const base: GameState = {
        phase: "in_round",
        seats,
        hands: { p0: [], p1: [], p2: [], p3: [] },
        chain: emptyChain(),
        boneyard: [],
        turnIndex: 0,
        turnNumber: 0,
        scores: defaultScores(),
        round: 1,
        options: defaultOptions(),
        history: [],
        lastActorPlayerId: null,
        lastOutcome: null,
    };
    return { ...base, ...overrides };
}

// Deterministic RNG: returns the values supplied, in order. Throws if exhausted.
function fixedRng(values: number[]): Rng {
    let i = 0;
    return () => {
        if (i >= values.length) throw new Error("Rng exhausted");
        const v = values[i] ?? 0;
        i++;
        return v;
    };
}

// ───────── tiles ─────────

describe("tiles", () => {
    it("normalizes pip order via tile()", () => {
        const t = makeTile(5, 2);
        expect(t[0]).toBe(2);
        expect(t[1]).toBe(5);
    });

    it("accepts already-sorted input", () => {
        const t = makeTile(1, 4);
        expect(t[0]).toBe(1);
        expect(t[1]).toBe(4);
    });

    it("throws on pip out of range", () => {
        expect(() => makeTile(-1, 3)).toThrow();
        expect(() => makeTile(3, 7)).toThrow();
    });

    it("throws on non-integer pips", () => {
        expect(() => makeTile(1.5, 3)).toThrow();
        expect(() => makeTile(2, NaN)).toThrow();
    });

    it("equals() is symmetric and strict", () => {
        expect(equals(makeTile(2, 5), makeTile(5, 2))).toBe(true);
        expect(equals(makeTile(2, 5), makeTile(2, 6))).toBe(false);
    });

    it("pips() sums pip values", () => {
        expect(pips(makeTile(0, 0))).toBe(0);
        expect(pips(makeTile(3, 4))).toBe(7);
        expect(pips(makeTile(6, 6))).toBe(12);
    });

    it("isDouble() detects matching ends", () => {
        expect(isDouble(makeTile(4, 4))).toBe(true);
        expect(isDouble(makeTile(4, 5))).toBe(false);
    });

    it("handPips() sums an entire hand", () => {
        const h: Hand = [makeTile(0, 0), makeTile(3, 4), makeTile(6, 6)];
        expect(handPips(h)).toBe(0 + 7 + 12);
    });

    it("allDoubleSixTiles() returns the canonical 28-tile set", () => {
        const set = allDoubleSixTiles();
        expect(set.length).toBe(28);
        expect(equals(set[0]!, makeTile(0, 0))).toBe(true);
        expect(equals(set[27]!, makeTile(6, 6))).toBe(true);
    });

    it("tileToString and tileFromString round-trip", () => {
        const t = makeTile(2, 5);
        const s = tileToString(t);
        expect(s).toBe("2|5");
        const back = tileFromString(s);
        expect(equals(t, back)).toBe(true);
    });

    it("tileFromString throws on malformed input", () => {
        expect(() => tileFromString("garbage")).toThrow();
        expect(() => tileFromString("1|2|3")).toThrow();
        expect(() => tileFromString("a|b")).toThrow();
    });

    it("containsTile finds a tile regardless of order", () => {
        const h: Hand = [makeTile(0, 0), makeTile(3, 4)];
        expect(containsTile(h, makeTile(4, 3))).toBe(true);
        expect(containsTile(h, makeTile(1, 2))).toBe(false);
    });

    it("removeTile returns new hand without the tile", () => {
        const h: Hand = [makeTile(0, 0), makeTile(3, 4), makeTile(6, 6)];
        const r = removeTile(h, makeTile(3, 4));
        expect(r.length).toBe(2);
        expect(containsTile(r, makeTile(3, 4))).toBe(false);
    });

    it("removeTile throws when tile not present", () => {
        const h: Hand = [makeTile(0, 0)];
        expect(() => removeTile(h, makeTile(6, 6))).toThrow();
    });
});

// ───────── moves ─────────

describe("moves.validMoves", () => {
    it("returns [] when phase is not in_round", () => {
        const state = fourPlayerState({
            phase: "round_end",
            hands: { p0: [makeTile(6, 6)], p1: [], p2: [], p3: [] },
        });
        expect(validMoves(state, pid("p0"))).toEqual([]);
    });

    it("returns [] when turnIndex is out of bounds", () => {
        const state = fourPlayerState({
            turnIndex: 99,
            hands: { p0: [makeTile(6, 6)], p1: [], p2: [], p3: [] },
        });
        expect(validMoves(state, pid("p0"))).toEqual([]);
    });

    it("returns [] when player has no hand entry", () => {
        // p0 is the current seat but their hand entry is missing (degenerate state).
        const state = fourPlayerState({
            hands: { p1: [], p2: [], p3: [] },
        });
        expect(validMoves(state, pid("p0"))).toEqual([]);
    });

    it("returns [] when not the players turn", () => {
        const state = fourPlayerState({
            hands: { p0: [makeTile(6, 6)], p1: [], p2: [], p3: [] },
            turnIndex: 1,
        });
        expect(validMoves(state, pid("p0"))).toEqual([]);
    });

    it("round 1: forces [6,6] when player holds it", () => {
        const state = fourPlayerState({
            hands: { p0: [makeTile(6, 6), makeTile(0, 1)], p1: [], p2: [], p3: [] },
        });
        const moves = validMoves(state, pid("p0"));
        expect(moves.length).toBe(1);
        expect(moves[0]!.kind).toBe("play");
        expect(equals((moves[0] as PlayMove).tile, makeTile(6, 6))).toBe(true);
    });

    it("round 1: returns [] when player doesn't hold [6,6]", () => {
        const state = fourPlayerState({
            hands: { p0: [makeTile(0, 1)], p1: [], p2: [], p3: [] },
        });
        expect(validMoves(state, pid("p0"))).toEqual([]);
    });

    it("round 2+: any tile is legal as opener", () => {
        const state = fourPlayerState({
            round: 2,
            hands: { p0: [makeTile(0, 1), makeTile(3, 4)], p1: [], p2: [], p3: [] },
        });
        const moves = validMoves(state, pid("p0"));
        expect(moves.length).toBe(2);
        expect(moves.every((m) => m.kind === "play")).toBe(true);
    });

    it("mid-round: a tile matching both ends produces two PlayMoves", () => {
        const chain: Chain = {
            tiles: [
                {
                    tile: makeTile(3, 5),
                    leftPip: 3,
                    rightPip: 5,
                    playedBy: pid("p0"),
                    turnNumber: 0,
                },
            ],
            leftEnd: 3,
            rightEnd: 5,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            hands: { p0: [], p1: [makeTile(3, 5)], p2: [], p3: [] },
        });
        const moves = validMoves(state, pid("p1"));
        expect(moves.length).toBe(2);
        expect(moves.some((m) => (m as PlayMove).side === "left")).toBe(true);
        expect(moves.some((m) => (m as PlayMove).side === "right")).toBe(true);
    });

    it("mid-round: returns a single PassMove when no tiles match", () => {
        const chain: Chain = {
            tiles: [
                {
                    tile: makeTile(3, 5),
                    leftPip: 3,
                    rightPip: 5,
                    playedBy: pid("p0"),
                    turnNumber: 0,
                },
            ],
            leftEnd: 3,
            rightEnd: 5,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            hands: { p0: [], p1: [makeTile(0, 1)], p2: [], p3: [] },
        });
        const moves = validMoves(state, pid("p1"));
        expect(moves.length).toBe(1);
        expect(moves[0]!.kind).toBe("pass");
    });

    it("mid-round: returns a single DrawMove when no tiles match AND boneyard non-empty", () => {
        const chain: Chain = {
            tiles: [
                {
                    tile: makeTile(3, 5),
                    leftPip: 3,
                    rightPip: 5,
                    playedBy: pid("p0"),
                    turnNumber: 0,
                },
            ],
            leftEnd: 3,
            rightEnd: 5,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            hands: { p0: [], p1: [makeTile(0, 1)], p2: [], p3: [] },
            boneyard: [makeTile(2, 2), makeTile(4, 6)],
        });
        const moves = validMoves(state, pid("p1"));
        expect(moves.length).toBe(1);
        expect(moves[0]!.kind).toBe("draw");
    });
});

describe("moves.applyMove", () => {
    it("pass advances turn and appends history", () => {
        const chain: Chain = {
            tiles: [
                {
                    tile: makeTile(3, 5),
                    leftPip: 3,
                    rightPip: 5,
                    playedBy: pid("p0"),
                    turnNumber: 0,
                },
            ],
            leftEnd: 3,
            rightEnd: 5,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            turnNumber: 5,
            hands: { p0: [], p1: [makeTile(0, 1)], p2: [], p3: [] },
        });
        const pass: PassMove = { kind: "pass", playerId: pid("p1") };
        const next = applyMove(state, pass);
        expect(next.turnIndex).toBe(2);
        expect(next.turnNumber).toBe(6);
        expect(next.lastActorPlayerId).toBe(pid("p1"));
        expect(next.history.length).toBe(1);
        expect(next.history[0]!.kind).toBe("pass");
    });

    it("opening play sets both chain ends and removes tile from hand", () => {
        const state = fourPlayerState({
            hands: { p0: [makeTile(6, 6), makeTile(0, 1)], p1: [], p2: [], p3: [] },
        });
        const play: PlayMove = {
            kind: "play",
            playerId: pid("p0"),
            tile: makeTile(6, 6),
            side: "left",
        };
        const next = applyMove(state, play);
        expect(next.chain.tiles.length).toBe(1);
        expect(next.chain.leftEnd).toBe(6);
        expect(next.chain.rightEnd).toBe(6);
        expect(next.hands["p0"]!.length).toBe(1);
        expect(next.turnIndex).toBe(1);
    });

    it("placing on left when incoming[0] matches leftEnd exposes incoming[1]", () => {
        const chain: Chain = {
            tiles: [
                {
                    tile: makeTile(1, 4),
                    leftPip: 1,
                    rightPip: 4,
                    playedBy: pid("p0"),
                    turnNumber: 0,
                },
            ],
            leftEnd: 1,
            rightEnd: 4,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            // [1, 3] is held normalized. incoming[0]=1, leftEnd=1 → matching=1, exposed=3.
            hands: { p0: [], p1: [makeTile(1, 3)], p2: [], p3: [] },
        });
        const play: PlayMove = {
            kind: "play",
            playerId: pid("p1"),
            tile: makeTile(1, 3),
            side: "left",
        };
        const next = applyMove(state, play);
        expect(next.chain.leftEnd).toBe(3);
        expect(next.chain.rightEnd).toBe(4);
    });

    it("placing on right when incoming[0] matches rightEnd exposes incoming[1]", () => {
        const chain: Chain = {
            tiles: [
                {
                    tile: makeTile(1, 4),
                    leftPip: 1,
                    rightPip: 4,
                    playedBy: pid("p0"),
                    turnNumber: 0,
                },
            ],
            leftEnd: 1,
            rightEnd: 4,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            // [4, 6] normalized. incoming[0]=4, rightEnd=4 → matching=4, exposed=6.
            hands: { p0: [], p1: [makeTile(4, 6)], p2: [], p3: [] },
        });
        const play: PlayMove = {
            kind: "play",
            playerId: pid("p1"),
            tile: makeTile(4, 6),
            side: "right",
        };
        const next = applyMove(state, play);
        expect(next.chain.leftEnd).toBe(1);
        expect(next.chain.rightEnd).toBe(6);
    });

    it("placing on left exposes the non-matching pip", () => {
        const chain: Chain = {
            tiles: [
                {
                    tile: makeTile(3, 5),
                    leftPip: 3,
                    rightPip: 5,
                    playedBy: pid("p0"),
                    turnNumber: 0,
                },
            ],
            leftEnd: 3,
            rightEnd: 5,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            hands: { p0: [], p1: [makeTile(1, 3)], p2: [], p3: [] },
        });
        const play: PlayMove = {
            kind: "play",
            playerId: pid("p1"),
            tile: makeTile(1, 3),
            side: "left",
        };
        const next = applyMove(state, play);
        expect(next.chain.leftEnd).toBe(1);
        expect(next.chain.rightEnd).toBe(5);
        expect(next.chain.tiles.length).toBe(2);
    });

    it("placing on right exposes the non-matching pip", () => {
        const chain: Chain = {
            tiles: [
                {
                    tile: makeTile(3, 5),
                    leftPip: 3,
                    rightPip: 5,
                    playedBy: pid("p0"),
                    turnNumber: 0,
                },
            ],
            leftEnd: 3,
            rightEnd: 5,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            hands: { p0: [], p1: [makeTile(2, 5)], p2: [], p3: [] },
        });
        const play: PlayMove = {
            kind: "play",
            playerId: pid("p1"),
            tile: makeTile(2, 5),
            side: "right",
        };
        const next = applyMove(state, play);
        expect(next.chain.leftEnd).toBe(3);
        expect(next.chain.rightEnd).toBe(2);
    });

    it("throws when caller submits Pass but a Play is required", () => {
        const state = fourPlayerState({
            hands: { p0: [makeTile(6, 6)], p1: [], p2: [], p3: [] },
        });
        const bad: PassMove = { kind: "pass", playerId: pid("p0") };
        expect(() => applyMove(state, bad)).toThrow();
    });

    it("throws when caller submits Play but a Pass is required", () => {
        const chain: Chain = {
            tiles: [
                { tile: makeTile(3, 5), leftPip: 3, rightPip: 5, playedBy: pid("p0"), turnNumber: 0 },
            ],
            leftEnd: 3,
            rightEnd: 5,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            // p1 holds [0,1] which matches neither end → forced pass
            hands: { p0: [], p1: [makeTile(0, 1)], p2: [], p3: [] },
        });
        const bad: PlayMove = {
            kind: "play",
            playerId: pid("p1"),
            tile: makeTile(0, 1),
            side: "left",
        };
        expect(() => applyMove(state, bad)).toThrow();
    });

    it("throws on illegal move (wrong tile)", () => {
        const state = fourPlayerState({
            hands: { p0: [makeTile(6, 6)], p1: [], p2: [], p3: [] },
        });
        const bad: PlayMove = {
            kind: "play",
            playerId: pid("p0"),
            tile: makeTile(0, 0),
            side: "left",
        };
        expect(() => applyMove(state, bad)).toThrow();
    });

    it("draw moves a boneyard tile into hand without advancing turn", () => {
        const chain: Chain = {
            tiles: [
                {
                    tile: makeTile(3, 5),
                    leftPip: 3,
                    rightPip: 5,
                    playedBy: pid("p0"),
                    turnNumber: 0,
                },
            ],
            leftEnd: 3,
            rightEnd: 5,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            turnNumber: 7,
            hands: { p0: [], p1: [makeTile(0, 1)], p2: [], p3: [] },
            boneyard: [makeTile(2, 2), makeTile(4, 6)],
        });
        // Pull the auto-tile from validMoves so the recorded tile is the engine's pick.
        const moves = validMoves(state, pid("p1"));
        expect(moves.length).toBe(1);
        expect(moves[0]!.kind).toBe("draw");
        const next = applyMove(state, moves[0]!);
        expect(next.turnIndex).toBe(1);
        expect(next.turnNumber).toBe(7);
        expect(next.boneyard.length).toBe(1);
        expect(equals(next.boneyard[0]!, makeTile(4, 6))).toBe(true);
        expect(next.hands["p1"]!.length).toBe(2);
        expect(containsTile(next.hands["p1"]!, makeTile(2, 2))).toBe(true);
        expect(next.history.length).toBe(1);
        expect(next.history[0]!.kind).toBe("draw");
    });

    it("draw → play sequence: drawn tile becomes playable, then plays normally", () => {
        const chain: Chain = {
            tiles: [
                {
                    tile: makeTile(3, 5),
                    leftPip: 3,
                    rightPip: 5,
                    playedBy: pid("p0"),
                    turnNumber: 0,
                },
            ],
            leftEnd: 3,
            rightEnd: 5,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            hands: { p0: [], p1: [makeTile(0, 1)], p2: [], p3: [] },
            // First drawn tile is [3,4], which matches the left end 3.
            boneyard: [makeTile(3, 4), makeTile(6, 6)],
        });
        const afterDraw = applyMove(state, validMoves(state, pid("p1"))[0]!);
        const moves2 = validMoves(afterDraw, pid("p1"));
        expect(moves2.every((m) => m.kind === "play")).toBe(true);
        expect(moves2.length).toBeGreaterThan(0);
    });

    it("draw is unavailable when boneyard is empty → pass is the only option", () => {
        const chain: Chain = {
            tiles: [
                {
                    tile: makeTile(3, 5),
                    leftPip: 3,
                    rightPip: 5,
                    playedBy: pid("p0"),
                    turnNumber: 0,
                },
            ],
            leftEnd: 3,
            rightEnd: 5,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            hands: { p0: [], p1: [makeTile(0, 1)], p2: [], p3: [] },
            boneyard: [],
        });
        const moves = validMoves(state, pid("p1"));
        expect(moves.length).toBe(1);
        expect(moves[0]!.kind).toBe("pass");
    });
});

// ───────── scoring ─────────

describe("scoring", () => {
    it("isRoundOver detects domino on empty hand", () => {
        const state = fourPlayerState({
            hands: { p0: [], p1: [makeTile(0, 1)], p2: [makeTile(2, 3)], p3: [makeTile(4, 5)] },
        });
        expect(isRoundOver(state)).toBe(true);
    });

    it("isRoundOver detects tranca on N consecutive passes", () => {
        const passes: PassMove[] = [
            { kind: "pass", playerId: pid("p0") },
            { kind: "pass", playerId: pid("p1") },
            { kind: "pass", playerId: pid("p2") },
            { kind: "pass", playerId: pid("p3") },
        ];
        const state = fourPlayerState({
            hands: { p0: [makeTile(0, 1)], p1: [makeTile(2, 3)], p2: [makeTile(4, 5)], p3: [makeTile(6, 6)] },
            history: passes,
        });
        expect(isRoundOver(state)).toBe(true);
    });

    it("isRoundOver is false mid-round", () => {
        const state = fourPlayerState({
            hands: { p0: [makeTile(0, 0)], p1: [makeTile(0, 1)], p2: [makeTile(2, 3)], p3: [makeTile(4, 5)] },
        });
        expect(isRoundOver(state)).toBe(false);
    });

    it("computeRoundOutcome: domino with opposing-team pip sum", () => {
        const chain: Chain = {
            tiles: [
                { tile: makeTile(3, 5), leftPip: 3, rightPip: 5, playedBy: pid("p0"), turnNumber: 0 },
                { tile: makeTile(0, 3), leftPip: 0, rightPip: 3, playedBy: pid("p0"), turnNumber: 1 },
            ],
            leftEnd: 0,
            rightEnd: 5,
        };
        const state = fourPlayerState({
            chain,
            hands: { p0: [], p1: [makeTile(1, 2)], p2: [makeTile(0, 0)], p3: [makeTile(6, 6)] },
            history: [
                { kind: "play", playerId: pid("p0"), tile: makeTile(0, 3), side: "left" },
            ],
        });
        const outcome = computeRoundOutcome(state);
        expect(outcome).not.toBeNull();
        expect(outcome!.kind).toBe("domino");
        expect(outcome!.winningTeam).toBe("A");
        // opposing team is B: p1 (3 pips) + p3 (12 pips) = 15
        expect(outcome!.points).toBe(15);
    });

    it("computeRoundOutcome: capicua bonus when winning tile matches both ends", () => {
        // Chain ends end up equal after winning move → capicua invariant.
        const chain: Chain = {
            tiles: [
                { tile: makeTile(4, 5), leftPip: 4, rightPip: 5, playedBy: pid("p0"), turnNumber: 0 },
                { tile: makeTile(3, 5), leftPip: 5, rightPip: 3, playedBy: pid("p0"), turnNumber: 1 },
            ],
            leftEnd: 4,
            rightEnd: 4,
        };
        const state = fourPlayerState({
            chain,
            hands: { p0: [], p1: [makeTile(1, 1)], p2: [makeTile(0, 0)], p3: [makeTile(2, 2)] },
            history: [
                { kind: "play", playerId: pid("p0"), tile: makeTile(3, 4), side: "left" },
            ],
        });
        const outcome = computeRoundOutcome(state);
        expect(outcome).not.toBeNull();
        expect(outcome!.kind).toBe("capicua");
        // base = 2 + 0 + 4 = 6; bonus = 25 (default capicuaBonus)
        expect(outcome!.points).toBe(6 + 25);
    });

    it("computeRoundOutcome: chuchazo when winning tile is [6,6]", () => {
        const chain: Chain = {
            tiles: [
                { tile: makeTile(6, 6), leftPip: 6, rightPip: 6, playedBy: pid("p0"), turnNumber: 0 },
            ],
            leftEnd: 6,
            rightEnd: 6,
        };
        const state = fourPlayerState({
            chain,
            hands: { p0: [], p1: [makeTile(1, 1)], p2: [makeTile(0, 0)], p3: [makeTile(2, 2)] },
            history: [
                { kind: "play", playerId: pid("p0"), tile: makeTile(6, 6), side: "left" },
            ],
        });
        const outcome = computeRoundOutcome(state);
        expect(outcome).not.toBeNull();
        expect(outcome!.kind).toBe("chuchazo");
        // chuchazo + capicua both apply (chain ends are 6 and 6). points = base + chuchazoBonus + capicuaBonus.
        // base = 2 + 0 + 4 = 6
        expect(outcome!.points).toBe(6 + 25 + 25);
    });

    it("computeRoundOutcome: tranca scores opposing team pips", () => {
        const passes: PassMove[] = [
            { kind: "pass", playerId: pid("p0") },
            { kind: "pass", playerId: pid("p1") },
            { kind: "pass", playerId: pid("p2") },
            { kind: "pass", playerId: pid("p3") },
        ];
        const state = fourPlayerState({
            hands: {
                p0: [makeTile(0, 1)], // A: 1
                p1: [makeTile(3, 4)], // B: 7
                p2: [makeTile(0, 2)], // A: 2
                p3: [makeTile(5, 5)], // B: 10
            },
            history: passes,
        });
        const outcome = computeRoundOutcome(state);
        expect(outcome).not.toBeNull();
        expect(outcome!.kind).toBe("tranca");
        // Team A total = 3, Team B total = 17. A wins. Scores B's 17.
        expect(outcome!.winningTeam).toBe("A");
        expect(outcome!.points).toBe(17);
    });

    it("computeRoundOutcome: tied tranca → team A wins, 0 points", () => {
        const passes: PassMove[] = [
            { kind: "pass", playerId: pid("p0") },
            { kind: "pass", playerId: pid("p1") },
            { kind: "pass", playerId: pid("p2") },
            { kind: "pass", playerId: pid("p3") },
        ];
        const state = fourPlayerState({
            hands: {
                p0: [makeTile(1, 2)], // A: 3
                p1: [makeTile(2, 3)], // B: 5
                p2: [makeTile(0, 2)], // A: 2
                p3: [makeTile(0, 0)], // B: 0
            },
            history: passes,
        });
        // A total = 5, B total = 5
        const outcome = computeRoundOutcome(state);
        expect(outcome!.kind).toBe("tranca");
        expect(outcome!.winningTeam).toBe("A");
        expect(outcome!.points).toBe(0);
    });

    it("applyRoundOutcome updates scores and transitions phase", () => {
        const state = fourPlayerState({ scores: { A: 100, B: 50 } });
        const out = applyRoundOutcome(state, {
            kind: "domino",
            winningTeam: "A",
            points: 30,
            remainingPipsByPlayer: {},
        });
        expect(out.scores.A).toBe(130);
        expect(out.scores.B).toBe(50);
        expect(out.phase).toBe("round_end");
    });

    it("applyRoundOutcome transitions to match_end at target", () => {
        const state = fourPlayerState({ scores: { A: 180, B: 50 } });
        const out = applyRoundOutcome(state, {
            kind: "domino",
            winningTeam: "A",
            points: 30,
            remainingPipsByPlayer: {},
        });
        expect(out.scores.A).toBe(210);
        expect(out.phase).toBe("match_end");
    });

    it("applyRoundOutcome credits team B without disturbing team A", () => {
        const state = fourPlayerState({ scores: { A: 75, B: 90 } });
        const out = applyRoundOutcome(state, {
            kind: "tranca",
            winningTeam: "B",
            points: 20,
            remainingPipsByPlayer: {},
        });
        expect(out.scores.A).toBe(75);
        expect(out.scores.B).toBe(110);
        expect(out.phase).toBe("round_end");
    });

    it("isMatchOver true when phase is match_end", () => {
        const state = fourPlayerState({ phase: "match_end" });
        expect(isMatchOver(state)).toBe(true);
    });

    it("isMatchOver true when a team reaches the target", () => {
        const state = fourPlayerState({ scores: { A: 200, B: 50 } });
        expect(isMatchOver(state)).toBe(true);
    });

    it("isMatchOver true when team B reaches the target", () => {
        const state = fourPlayerState({ scores: { A: 50, B: 200 } });
        expect(isMatchOver(state)).toBe(true);
    });

    it("isMatchOver false when neither team has reached target and phase != match_end", () => {
        const state = fourPlayerState({ scores: { A: 150, B: 150 } });
        expect(isMatchOver(state)).toBe(false);
    });

    it("isZapato returns losing team when they finished with 0", () => {
        const state = fourPlayerState({ phase: "match_end", scores: { A: 200, B: 0 } });
        expect(isZapato(state)).toBe("B");
    });

    it("isZapato returns null when losing team has > 0", () => {
        const state = fourPlayerState({ phase: "match_end", scores: { A: 200, B: 50 } });
        expect(isZapato(state)).toBeNull();
    });
});

// ───────── steal ─────────

describe("steal", () => {
    it("shouldSteal proceeds when source has >= 2 tiles and round 1", () => {
        const chain: Chain = {
            tiles: [
                { tile: makeTile(6, 6), leftPip: 6, rightPip: 6, playedBy: pid("p0"), turnNumber: 0 },
            ],
            leftEnd: 6,
            rightEnd: 6,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            turnNumber: 1,
            lastActorPlayerId: pid("p0"),
            hands: { p0: [makeTile(0, 0), makeTile(1, 1)], p1: [], p2: [], p3: [] },
        });
        const d = shouldSteal(state);
        expect(d.proceed).toBe(true);
    });

    it("shouldSteal skips on immunity (source has 1 tile)", () => {
        const chain: Chain = {
            tiles: [
                { tile: makeTile(0, 1), leftPip: 0, rightPip: 1, playedBy: pid("p0"), turnNumber: 0 },
            ],
            leftEnd: 0,
            rightEnd: 1,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            turnNumber: 1,
            lastActorPlayerId: pid("p0"),
            hands: { p0: [makeTile(2, 2)], p1: [], p2: [], p3: [] },
        });
        const d = shouldSteal(state);
        expect(d.proceed).toBe(false);
        if (!d.proceed) expect(d.reason).toBe("immunity");
    });

    it("shouldSteal skips when source just won (0 tiles)", () => {
        const chain: Chain = {
            tiles: [
                { tile: makeTile(0, 1), leftPip: 0, rightPip: 1, playedBy: pid("p0"), turnNumber: 0 },
            ],
            leftEnd: 0,
            rightEnd: 1,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            turnNumber: 1,
            lastActorPlayerId: pid("p0"),
            hands: { p0: [], p1: [], p2: [], p3: [] },
        });
        const d = shouldSteal(state);
        expect(d.proceed).toBe(false);
        if (!d.proceed) expect(d.reason).toBe("source-won-round");
    });

    it("shouldSteal skips first-move-of-round for round 2+", () => {
        const chain: Chain = {
            tiles: [
                { tile: makeTile(3, 4), leftPip: 3, rightPip: 4, playedBy: pid("p0"), turnNumber: 0 },
            ],
            leftEnd: 3,
            rightEnd: 4,
        };
        const state = fourPlayerState({
            chain,
            round: 2,
            turnIndex: 1,
            turnNumber: 1,
            lastActorPlayerId: pid("p0"),
            hands: { p0: [makeTile(0, 0), makeTile(1, 1)], p1: [], p2: [], p3: [] },
        });
        const d = shouldSteal(state);
        expect(d.proceed).toBe(false);
        if (!d.proceed) expect(d.reason).toBe("first-move-of-round");
    });

    it("shouldSteal does NOT skip round 1's first move (intentional 6-6 penalty)", () => {
        const chain: Chain = {
            tiles: [
                { tile: makeTile(6, 6), leftPip: 6, rightPip: 6, playedBy: pid("p0"), turnNumber: 0 },
            ],
            leftEnd: 6,
            rightEnd: 6,
        };
        const state = fourPlayerState({
            chain,
            round: 1,
            turnIndex: 1,
            turnNumber: 1,
            lastActorPlayerId: pid("p0"),
            hands: { p0: [makeTile(0, 0), makeTile(1, 1)], p1: [], p2: [], p3: [] },
        });
        const d = shouldSteal(state);
        expect(d.proceed).toBe(true);
    });

    it("resolveStealPhase transfers a tile and logs StealEvent", () => {
        const chain: Chain = {
            tiles: [
                { tile: makeTile(6, 6), leftPip: 6, rightPip: 6, playedBy: pid("p0"), turnNumber: 0 },
            ],
            leftEnd: 6,
            rightEnd: 6,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            turnNumber: 1,
            lastActorPlayerId: pid("p0"),
            hands: {
                p0: [makeTile(0, 0), makeTile(1, 1), makeTile(2, 2)],
                p1: [makeTile(3, 3)],
                p2: [],
                p3: [],
            },
        });
        // rng(0.5) * 3 → idx 1 → steals (1,1)
        const next = resolveStealPhase(state, fixedRng([0.5]));
        expect(next.hands["p0"]!.length).toBe(2);
        expect(next.hands["p1"]!.length).toBe(2);
        expect(containsTile(next.hands["p1"]!, makeTile(1, 1))).toBe(true);
        expect(containsTile(next.hands["p0"]!, makeTile(1, 1))).toBe(false);
        expect(next.history.length).toBe(1);
        expect(next.history[0]!.kind).toBe("steal");
    });

    it("resolveStealPhase is deterministic with a fixed RNG", () => {
        const chain: Chain = {
            tiles: [
                { tile: makeTile(6, 6), leftPip: 6, rightPip: 6, playedBy: pid("p0"), turnNumber: 0 },
            ],
            leftEnd: 6,
            rightEnd: 6,
        };
        const mk = () =>
            fourPlayerState({
                chain,
                turnIndex: 1,
                turnNumber: 1,
                lastActorPlayerId: pid("p0"),
                hands: {
                    p0: [makeTile(0, 0), makeTile(1, 1), makeTile(2, 2)],
                    p1: [],
                    p2: [],
                    p3: [],
                },
            });
        const a = resolveStealPhase(mk(), fixedRng([0.0]));
        const b = resolveStealPhase(mk(), fixedRng([0.0]));
        const stolenA = (a.history[0] as { stolenTile: Tile }).stolenTile;
        const stolenB = (b.history[0] as { stolenTile: Tile }).stolenTile;
        expect(equals(stolenA, stolenB)).toBe(true);
    });

    it("resolveStealPhase appends a StealSkipped on immunity", () => {
        const chain: Chain = {
            tiles: [
                { tile: makeTile(0, 1), leftPip: 0, rightPip: 1, playedBy: pid("p0"), turnNumber: 0 },
            ],
            leftEnd: 0,
            rightEnd: 1,
        };
        const state = fourPlayerState({
            chain,
            turnIndex: 1,
            turnNumber: 1,
            lastActorPlayerId: pid("p0"),
            hands: { p0: [makeTile(2, 2)], p1: [], p2: [], p3: [] },
        });
        const next = resolveStealPhase(state, fixedRng([]));
        expect(next.history.length).toBe(1);
        expect(next.history[0]!.kind).toBe("steal-skipped");
        if (next.history[0]!.kind === "steal-skipped") {
            expect(next.history[0]!.reason).toBe("immunity");
        }
    });

    it("resolveStealPhase no-ops on degenerate state (null lastActor)", () => {
        const state = fourPlayerState({ lastActorPlayerId: null });
        const next = resolveStealPhase(state, fixedRng([]));
        expect(next.history.length).toBe(0);
        expect(next).toBe(state);
    });
});
