import type { GameState } from "../engine/types.js";

export function ScoreBar({ state }: { state: GameState }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-pr-coal-soft bg-pr-coal-soft/40 px-4 py-2 text-pr-ivory">
            <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-wider text-pr-ivory-dim">Round</span>
                <span className="font-display text-lg">{state.round}</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-baseline gap-2">
                    <span className="rounded bg-pr-blue px-1.5 py-0.5 text-[10px] font-bold text-pr-white">A</span>
                    <span className="font-display text-xl tabular-nums">{state.scores.A}</span>
                </div>
                <span className="text-pr-ivory-dim">·</span>
                <div className="flex items-baseline gap-2">
                    <span className="rounded bg-pr-red px-1.5 py-0.5 text-[10px] font-bold text-pr-white">B</span>
                    <span className="font-display text-xl tabular-nums">{state.scores.B}</span>
                </div>
            </div>
            <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-pr-ivory-dim">to win</div>
                <div className="font-display text-sm">{state.options.targetScore}</div>
            </div>
        </div>
    );
}
