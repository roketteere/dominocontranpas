import type { GameState, Move, PlayMove, PlayerId } from "../engine/types.js";
import { isDouble, pips } from "../engine/tiles.js";
import { validMoves } from "../engine/moves.js";

// Pick a move for the given AI player at the current state. Returns the chosen Move.
// Strategy:
//   1. If forced to pass, pass.
//   2. Prefer the play with the highest pip count (dump heavy tiles early).
//   3. Among equal-pip choices, prefer non-doubles (save doubles for when forced).
//   4. Among doubles, prefer lower pip totals (lose less if forced into a tranca).
//   5. Final tiebreak: left side over right, deterministically.
export function chooseAiMove(state: GameState, playerId: PlayerId): Move {
    const legal = validMoves(state, playerId);
    if (legal.length === 0) {
        // Caller violated turn order; surface the issue rather than guess.
        throw new Error("AI cannot move: no legal moves for " + String(playerId));
    }

    if (legal.length === 1 && legal[0]!.kind === "pass") {
        return legal[0]!;
    }

    const plays = legal.filter((m): m is PlayMove => m.kind === "play");
    if (plays.length === 0) {
        // Fallback should not be reached if legal is non-empty and not all-pass.
        return legal[0]!;
    }

    plays.sort((a, b) => {
        const pipsB = pips(b.tile);
        const pipsA = pips(a.tile);
        if (pipsB !== pipsA) return pipsB - pipsA;
        const aDouble = isDouble(a.tile) ? 1 : 0;
        const bDouble = isDouble(b.tile) ? 1 : 0;
        if (aDouble !== bDouble) return aDouble - bDouble;
        if (a.side !== b.side) return a.side === "left" ? -1 : 1;
        return 0;
    });

    return plays[0]!;
}
