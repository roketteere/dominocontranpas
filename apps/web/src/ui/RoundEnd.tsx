import { useGameStore } from "../state/gameStore.js";
import type { RoundOutcomeKind } from "../engine/types.js";

const KIND_LABEL: Record<RoundOutcomeKind, { es: string; en: string }> = {
    domino: { es: "¡Dominó!", en: "Hand played out" },
    capicua: { es: "¡Capicúa!", en: "Both ends matched" },
    chuchazo: { es: "¡Chuchazo!", en: "Won with the double-six" },
    tranca: { es: "Tranca", en: "Chain locked" },
};

export function RoundEnd() {
    const state = useGameStore((s) => s.state);
    const startNextRound = useGameStore((s) => s.startNextRound);
    const returnToMenu = useGameStore((s) => s.returnToMenu);
    if (state === null || state.lastOutcome === null) return null;
    const o = state.lastOutcome;
    const label = KIND_LABEL[o.kind];
    const teamAccent = o.winningTeam === "A" ? "text-pr-blue" : "text-pr-red";
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-pr-ivory-dim">Round {state.round}</p>
                <h2 className={`font-display text-5xl ${teamAccent}`}>{label.es}</h2>
                <p className="text-sm text-pr-ivory-dim">{label.en}</p>
            </div>
            <div className="rounded-xl border border-pr-coal-soft bg-pr-coal-soft/40 px-6 py-4">
                <p className="text-xs uppercase tracking-wider text-pr-ivory-dim">Points</p>
                <p className="font-display text-4xl text-pr-ivory">
                    +{o.points}{" "}
                    <span className="text-base text-pr-ivory-dim">to team {o.winningTeam}</span>
                </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-pr-ivory-dim">
                {Object.entries(o.remainingPipsByPlayer).map(([pid, pips]) => (
                    <p key={pid}>
                        <span className="font-mono">{pid}</span> · {pips} pip{pips === 1 ? "" : "s"}
                    </p>
                ))}
            </div>
            <div className="mt-4 flex gap-3">
                <button
                    type="button"
                    onClick={startNextRound}
                    className="rounded-xl bg-pr-blue px-6 py-2 font-display text-pr-white shadow hover:scale-105 active:scale-95"
                >
                    Next round
                </button>
                <button
                    type="button"
                    onClick={returnToMenu}
                    className="rounded-xl border border-pr-coal-soft px-6 py-2 font-display text-pr-ivory-dim hover:text-pr-ivory"
                >
                    Quit to menu
                </button>
            </div>
        </div>
    );
}
