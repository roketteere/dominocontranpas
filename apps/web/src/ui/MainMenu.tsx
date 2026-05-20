import { useGameStore } from "../state/gameStore.js";

export function MainMenu() {
    const startSoloMatch = useGameStore((s) => s.startSoloMatch);
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
            <header className="space-y-2">
                <h1 className="font-display text-4xl text-pr-ivory">
                    <span className="text-pr-red">Dominos</span>{" "}
                    <span className="text-pr-ivory-dim">Con</span>{" "}
                    <span className="text-pr-blue">Tanpas</span>
                </h1>
                <p className="text-sm text-pr-ivory-dim">
                    Traditional Dominó Criollo plus the steal mechanic.
                </p>
            </header>

            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={startSoloMatch}
                    className="rounded-xl bg-pr-blue px-8 py-3 font-display text-lg text-pr-white shadow-lg shadow-pr-blue/30 transition-transform hover:scale-105 active:scale-95"
                >
                    Solo vs AI
                </button>
                <button
                    type="button"
                    disabled
                    className="rounded-xl border border-pr-coal-soft px-8 py-3 font-display text-sm text-pr-ivory-dim opacity-60"
                >
                    Online with friends (coming in Phase 3)
                </button>
            </div>

            <footer className="space-y-1 text-[11px] text-pr-ivory-dim">
                <p>4 seats · 2 teams · first to 200 wins</p>
                <p>After every turn, the next player steals one tile blindly.</p>
                <p>Reach 1 tile to gain immunity (no more steals).</p>
            </footer>
        </div>
    );
}
