import type {
    GamePhase,
    GameState,
    Hand,
    Move,
    PassMove,
    PlayMove,
    PlayerId,
    RoundOutcome,
    RoundOutcomeKind,
    Scores,
    TeamId,
} from "./types.js";
import { equals, handPips, tile as makeTile } from "./tiles.js";

// Filter only Move entries (kind "play" or "pass") out of the history.
function moveHistory(state: GameState): Move[] {
    const out: Move[] = [];
    for (const h of state.history) {
        if (h.kind === "play" || h.kind === "pass") out.push(h);
    }
    return out;
}

// Find the player (if any) whose hand is empty.
function findEmptyHandPlayer(state: GameState): PlayerId | null {
    for (const seat of state.seats) {
        const hand = state.hands[seat.playerId as unknown as string];
        if (hand !== undefined && hand.length === 0) return seat.playerId;
    }
    return null;
}

// True iff the last `seats.length` move-history entries are all passes.
function isTranca(state: GameState): boolean {
    const seatsCount = state.seats.length;
    const moves = moveHistory(state);
    if (moves.length < seatsCount) return false;
    for (let i = moves.length - seatsCount; i < moves.length; i++) {
        const m = moves[i];
        if (m === undefined) return false;
        if (m.kind !== "pass") return false;
    }
    return true;
}

// True if the round is over by either domino (empty hand) or tranca (chain locked).
export function isRoundOver(state: GameState): boolean {
    if (findEmptyHandPlayer(state) !== null) return true;
    return isTranca(state);
}

// Per-player remaining-pip totals keyed by playerId.
function remainingPipsByPlayer(state: GameState): Record<string, number> {
    const out: Record<string, number> = {};
    for (const seat of state.seats) {
        const hand = state.hands[seat.playerId as unknown as string];
        out[seat.playerId as unknown as string] = hand !== undefined ? handPips(hand) : 0;
    }
    return out;
}

// Find the team for a given player from seats.
function teamOf(state: GameState, playerId: PlayerId): TeamId | null {
    for (const seat of state.seats) {
        if (seat.playerId === playerId) return seat.team;
    }
    /* c8 ignore next -- only called with a playerId we already found via findEmptyHandPlayer (iterates seats) */
    return null;
}

// Sum of remaining pips for one team.
function teamPips(state: GameState, team: TeamId): number {
    let total = 0;
    for (const seat of state.seats) {
        if (seat.team !== team) continue;
        const hand = state.hands[seat.playerId as unknown as string];
        if (hand !== undefined) total += handPips(hand);
    }
    return total;
}

// Compute the round outcome if the round is over; null otherwise.
export function computeRoundOutcome(state: GameState): RoundOutcome | null {
    if (!isRoundOver(state)) return null;

    const winningPlayer = findEmptyHandPlayer(state);

    if (winningPlayer !== null) {
        // Domino path.
        const winningTeam = teamOf(state, winningPlayer);
        if (winningTeam === null) return null;
        const losingTeam: TeamId = winningTeam === "A" ? "B" : "A";

        // Find the winning play (the most recent "play" move).
        const moves = moveHistory(state);
        let winningPlay: PlayMove | null = null;
        for (let i = moves.length - 1; i >= 0; i--) {
            const m = moves[i];
            if (m !== undefined && m.kind === "play") {
                winningPlay = m;
                break;
            }
        }
        if (winningPlay === null) return null;

        // Detect capicua: after the winning move, chain.leftEnd === chain.rightEnd iff the winning
        // tile could have been played on either side.
        const isCapicua =
            state.chain.leftEnd !== null &&
            state.chain.rightEnd !== null &&
            state.chain.leftEnd === state.chain.rightEnd;

        // Detect chuchazo: the winning tile is [6,6].
        const isChuchazo = equals(winningPlay.tile, makeTile(6, 6));

        // Kind: most specific label, but bonuses stack.
        let kind: RoundOutcomeKind = "domino";
        if (isChuchazo) kind = "chuchazo";
        else if (isCapicua) kind = "capicua";

        // Base points = sum of opposing teams remaining pips.
        let points = teamPips(state, losingTeam);
        if (isCapicua) points += state.options.capicuaBonus;
        if (isChuchazo) points += state.options.chuchazoBonus;

        return {
            kind,
            winningTeam,
            points,
            remainingPipsByPlayer: remainingPipsByPlayer(state),
        };
    }

    // Tranca path: no winner. Lower team total wins; ties go to team A.
    const totalA = teamPips(state, "A");
    const totalB = teamPips(state, "B");
    const winningTeam: TeamId = totalA <= totalB ? "A" : "B";
    const losingTeam: TeamId = winningTeam === "A" ? "B" : "A";
    // Tied tranca: winningTeam = A, points = 0 by tiebreaker convention.
    const points = totalA === totalB ? 0 : teamPips(state, losingTeam);

    return {
        kind: "tranca",
        winningTeam,
        points,
        remainingPipsByPlayer: remainingPipsByPlayer(state),
    };
}

// Apply a round outcome to the state. Updates scores, transitions phase, records lastOutcome.
export function applyRoundOutcome(state: GameState, outcome: RoundOutcome): GameState {
    const currentForWinner = state.scores[outcome.winningTeam];
    const newWinnerScore = currentForWinner + outcome.points;
    const otherTeam: TeamId = outcome.winningTeam === "A" ? "B" : "A";
    const otherScore = state.scores[otherTeam];

    const newScores: Scores = (outcome.winningTeam === "A"
        ? { A: newWinnerScore, B: otherScore }
        : { A: otherScore, B: newWinnerScore });

    const nextPhase: GamePhase =
        newWinnerScore >= state.options.targetScore ? "match_end" : "round_end";

    return {
        ...state,
        scores: newScores,
        phase: nextPhase,
        lastOutcome: outcome,
    };
}

// True if the match is over (either flagged or a team reached target).
export function isMatchOver(state: GameState): boolean {
    if (state.phase === "match_end") return true;
    if (state.scores.A >= state.options.targetScore) return true;
    if (state.scores.B >= state.options.targetScore) return true;
    return false;
}

// If the match is over and the losing team finished with 0 points, return that team. Otherwise null.
export function isZapato(state: GameState): TeamId | null {
    if (!isMatchOver(state)) return null;
    const aWon = state.scores.A > state.scores.B;
    const losingTeam: TeamId = aWon ? "B" : "A";
    return state.scores[losingTeam] === 0 ? losingTeam : null;
}
