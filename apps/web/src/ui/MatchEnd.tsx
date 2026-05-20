import { useGameStore } from "../state/gameStore.js";

export function MatchEnd() {
    const state = useGameStore((s) => s.state);
    const lastZapato = useGameStore((s) => s.lastZapato);
    const returnToMenu = useGameStore((s) => s.returnToMenu);
    if (state === null) return null;
    const winner = state.scores.A > state.scores.B ? "A" : "B";
    const winnerAccent = winner === "A" ? "text-pr-blue" : "text-pr-red";
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-pr-ivory-dim">Match over</p>
                <h2 className={`font-display text-6xl ${winnerAccent}`}>Team {winner} wins</h2>
                {lastZapato !== null && (
                    <p className="font-display text-2xl text-pr-coqui">
                        ¡Zapato! Team {lastZapato} finished with 0 points.
                    </p>
                )}
            </div>
            <div className="flex items-center gap-6">
                <div className="text-center">
                    <p className="text-xs uppercase tracking-wider text-pr-ivory-dim">Team A</p>
                    <p className="font-display text-5xl text-pr-blue">{state.scores.A}</p>
                </div>
                <div className="text-pr-ivory-dim">vs</div>
                <div className="text-center">
                    <p className="text-xs uppercase tracking-wider text-pr-ivory-dim">Team B</p>
                    <p className="font-display text-5xl text-pr-red">{state.scores.B}</p>
                </div>
            </div>
            <button
                type="button"
                onClick={returnToMenu}
                className="rounded-xl bg-pr-blue px-8 py-3 font-display text-lg text-pr-white shadow-lg shadow-pr-blue/30 hover:scale-105 active:scale-95"
            >
                Play again
            </button>
        </div>
    );
}
