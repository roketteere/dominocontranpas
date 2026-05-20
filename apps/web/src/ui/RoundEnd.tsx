import { useGameStore } from "../state/gameStore.js";
import type { RoundOutcomeKind } from "../engine/types.js";
import { useT } from "../i18n/index.js";
import type { StringKey } from "../i18n/strings.js";

const KIND_TITLE: Record<RoundOutcomeKind, StringKey> = {
    domino: "outcomeDomino",
    capicua: "outcomeCapicua",
    chuchazo: "outcomeChuchazo",
    tranca: "outcomeTranca",
};

const KIND_DESC: Record<RoundOutcomeKind, StringKey> = {
    domino: "outcomeDescDomino",
    capicua: "outcomeDescCapicua",
    chuchazo: "outcomeDescChuchazo",
    tranca: "outcomeDescTranca",
};

export function RoundEnd() {
    const state = useGameStore((s) => s.state);
    const startNextRound = useGameStore((s) => s.startNextRound);
    const returnToMenu = useGameStore((s) => s.returnToMenu);
    const t = useT();
    if (state === null || state.lastOutcome === null) return null;
    const o = state.lastOutcome;
    const teamAccent = o.winningTeam === "A" ? "text-pr-blue" : "text-pr-red";
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-pr-ivory-dim">
                    {t("round")} {state.round}
                </p>
                <h2 className={`font-display text-5xl ${teamAccent}`}>{t(KIND_TITLE[o.kind])}</h2>
                <p className="text-sm text-pr-ivory-dim">{t(KIND_DESC[o.kind])}</p>
            </div>
            <div className="rounded-xl border border-pr-coal-soft bg-pr-coal-soft/40 px-6 py-4">
                <p className="text-xs uppercase tracking-wider text-pr-ivory-dim">{t("points")}</p>
                <p className="font-display text-4xl text-pr-ivory">
                    +{o.points}{" "}
                    <span className="text-base text-pr-ivory-dim">
                        {t("pointsToTeam", { team: o.winningTeam })}
                    </span>
                </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-pr-ivory-dim">
                {Object.entries(o.remainingPipsByPlayer).map(([pid, pipsCount]) => (
                    <p key={pid}>
                        <span className="font-mono">{pid}</span> · {pipsCount}
                    </p>
                ))}
            </div>
            <div className="mt-4 flex gap-3">
                <button
                    type="button"
                    onClick={startNextRound}
                    className="rounded-xl bg-pr-blue px-6 py-2 font-display text-pr-white shadow hover:scale-105 active:scale-95"
                >
                    {t("nextRound")}
                </button>
                <button
                    type="button"
                    onClick={returnToMenu}
                    className="rounded-xl border border-pr-coal-soft px-6 py-2 font-display text-pr-ivory-dim hover:text-pr-ivory"
                >
                    {t("quitToMenu")}
                </button>
            </div>
        </div>
    );
}
