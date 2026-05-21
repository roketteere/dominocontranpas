// Validation step for the engine path: this module imports a function from the shared engine
// at apps/web/src/engine and uses it. If `pnpm typecheck` and `convex codegen` succeed against
// this file, the cross-package import works and the rest of Phase 3 can build on it.

import { query } from "./_generated/server.js";
import { validMoves } from "../web/src/engine/moves.js";

// Smoke check: returns the number of validMoves in a degenerate state. Caller never relies on
// the value; we only need to prove the import is bundleable.
export const engineSmoke = query({
    args: {},
    handler: async () => {
        const state = {
            phase: "lobby" as const,
            seats: [],
            hands: {},
            chain: { tiles: [], leftEnd: null, rightEnd: null },
            turnIndex: 0,
            turnNumber: 0,
            scores: { A: 0, B: 0 } as const,
            round: 0,
            options: {
                targetScore: 200 as const,
                capicuaBonus: 25,
                chuchazoBonus: 25,
                mode: "4p-partners" as const,
            },
            history: [],
            lastActorPlayerId: null,
            lastOutcome: null,
        };
        const moves = validMoves(state, "nobody" as unknown as Parameters<typeof validMoves>[1]);
        return { moveCount: moves.length };
    },
});
