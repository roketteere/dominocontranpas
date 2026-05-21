import { create } from "zustand";
import type { GameState, Move, PlayerId, RoundOutcome, TeamId } from "../engine/types.js";
import type { Lang } from "../i18n/strings.js";

const LANG_KEY = "dct.lang";

function loadLang(): Lang {
    try {
        const v = localStorage.getItem(LANG_KEY);
        if (v === "es" || v === "en") return v;
    } catch {
        // localStorage may be unavailable in some sandboxes; fall through.
    }
    // Default: pick based on browser language. PR Spanish speakers usually have es-* locales.
    if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("es")) {
        return "es";
    }
    return "en";
}

function saveLang(lang: Lang): void {
    try {
        localStorage.setItem(LANG_KEY, lang);
    } catch {
        // best-effort
    }
}
import { applyMove, validMoves } from "../engine/moves.js";
import { resolveStealPhase } from "../engine/steal.js";
import {
    applyRoundOutcome,
    computeRoundOutcome,
    isMatchOver,
    isRoundOver,
    isZapato,
} from "../engine/scoring.js";
import {
    cryptoRng,
    dealRound,
    defaultGameOptions,
    fourPartnerSeats,
    initialGameState,
} from "../engine/setup.js";
import { chooseAiMove } from "../ai/heuristicAi.js";

export type Screen = "menu" | "playing" | "round_end" | "match_end" | "online";

export type GameStoreState = {
    screen: Screen;
    state: GameState | null;
    humanPlayerId: PlayerId | null;
    aiThinking: boolean;
    lastZapato: TeamId | null;
    lang: Lang;

    startSoloMatch: () => void;
    submitHumanMove: (move: Move) => void;
    advanceAi: () => void;
    startNextRound: () => void;
    returnToMenu: () => void;
    setLang: (lang: Lang) => void;
};

const AI_THINK_MS = 700;
const STEAL_PAUSE_MS = 500;

function legalForActor(state: GameState): { actorId: PlayerId; moves: ReturnType<typeof validMoves> } | null {
    const seat = state.seats[state.turnIndex];
    if (seat === undefined) return null;
    return { actorId: seat.playerId, moves: validMoves(state, seat.playerId) };
}

export const useGameStore = create<GameStoreState>((set, get) => ({
    screen: "menu",
    state: null,
    humanPlayerId: null,
    aiThinking: false,
    lastZapato: null,
    lang: loadLang(),

    startSoloMatch: () => {
        const seats = fourPartnerSeats(
            ["You", "Lefty", "Compa", "Righty"],
            [false, true, true, true],
        );
        const options = defaultGameOptions("solo-vs-ai");
        const base = initialGameState(seats, options);
        const dealt = dealRound(base, cryptoRng(), null);
        const humanSeat = seats[0]!;
        set({
            screen: "playing",
            state: dealt,
            humanPlayerId: humanSeat.playerId,
            aiThinking: false,
            lastZapato: null,
        });
        // If the human isn't the opener, hand off to the AI loop.
        if (dealt.turnIndex !== 0) {
            queueMicrotask(() => get().advanceAi());
        }
    },

    submitHumanMove: (move) => {
        const current = get().state;
        if (current === null) return;
        const afterMove = applyMove(current, move);
        const afterSteal = resolveStealPhase(afterMove, cryptoRng());
        set({ state: afterSteal });
        finalizeTurn(set, get);
    },

    advanceAi: () => {
        const current = get().state;
        if (current === null) return;
        const info = legalForActor(current);
        if (info === null) return;
        const seat = current.seats[current.turnIndex];
        if (seat === undefined || !seat.isAI) return;
        set({ aiThinking: true });
        setTimeout(() => {
            const stateNow = get().state;
            if (stateNow === null) return;
            const move = chooseAiMove(stateNow, info.actorId);
            const afterMove = applyMove(stateNow, move);
            const afterSteal = resolveStealPhase(afterMove, cryptoRng());
            set({ state: afterSteal, aiThinking: false });
            finalizeTurn(set, get);
        }, AI_THINK_MS);
    },

    startNextRound: () => {
        const current = get().state;
        if (current === null) return;
        // Find the winning seat from the last outcome to act as next opener.
        let openerIdx = 0;
        const last = current.lastOutcome;
        if (last !== null) {
            // Pick any seat on the winning team; default to the first one in seat order.
            for (let i = 0; i < current.seats.length; i++) {
                const s = current.seats[i];
                if (s !== undefined && s.team === last.winningTeam) {
                    openerIdx = i;
                    break;
                }
            }
        }
        // Round counter increments inside dealRound. Reset phase to in_round.
        const dealt = dealRound({ ...current, phase: "in_round" }, cryptoRng(), openerIdx);
        set({ screen: "playing", state: dealt });
        const seat = dealt.seats[dealt.turnIndex];
        if (seat !== undefined && seat.isAI) {
            queueMicrotask(() => get().advanceAi());
        }
    },

    returnToMenu: () => {
        set({ screen: "menu", state: null, humanPlayerId: null, aiThinking: false, lastZapato: null });
    },

    setLang: (lang) => {
        saveLang(lang);
        set({ lang });
    },
}));

// Shared post-move bookkeeping: detect round end, schedule next AI turn, etc.
function finalizeTurn(
    set: (partial: Partial<GameStoreState>) => void,
    get: () => GameStoreState,
): void {
    const s = get().state;
    if (s === null) return;

    if (isRoundOver(s)) {
        const outcome: RoundOutcome | null = computeRoundOutcome(s);
        if (outcome !== null) {
            const afterScore = applyRoundOutcome(s, outcome);
            const matchOver = isMatchOver(afterScore);
            const zapato = matchOver ? isZapato(afterScore) : null;
            set({
                state: afterScore,
                screen: matchOver ? "match_end" : "round_end",
                lastZapato: zapato,
            });
        }
        return;
    }

    // Round continues. If the next actor is an AI, schedule their turn.
    const nextSeat = s.seats[s.turnIndex];
    if (nextSeat !== undefined && nextSeat.isAI) {
        setTimeout(() => get().advanceAi(), STEAL_PAUSE_MS);
    }
}
