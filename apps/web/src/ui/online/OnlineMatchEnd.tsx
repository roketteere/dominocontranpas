import { useQuery } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import { useIdentityStore } from "../../state/identityStore.js";
import { useOnlineStore } from "../../state/onlineGameStore.js";
import { useT } from "../../i18n/index.js";

export function OnlineMatchEnd() {
    const t = useT();
    const gameId = useOnlineStore((s) => s.gameId);
    const clearGame = useOnlineStore((s) => s.clearGame);
    const deviceId = useIdentityStore((s) => s.deviceId);
    const me = useQuery(api.users.getUserByDeviceId, { deviceId });
    const view = useQuery(
        api.views.myGameView,
        gameId !== null && me !== null && me !== undefined
            ? { gameId, userId: me._id }
            : "skip",
    );

    if (view === null || view === undefined) {
        return <p className="p-4 text-center text-pr-ivory-dim">…</p>;
    }
    const winner = view.scores.A > view.scores.B ? "A" : "B";
    const winnerAccent = winner === "A" ? "text-pr-blue" : "text-pr-red";
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <p className="text-xs uppercase tracking-widest text-pr-ivory-dim">{t("matchOver")}</p>
            <h2 className={`font-display text-6xl ${winnerAccent}`}>
                {t("teamWins", { team: winner })}
            </h2>
            <div className="flex items-center gap-6">
                <div className="text-center">
                    <p className="text-xs uppercase tracking-wider text-pr-ivory-dim">
                        {t("team")} A
                    </p>
                    <p className="font-display text-5xl text-pr-blue">{view.scores.A}</p>
                </div>
                <div className="text-pr-ivory-dim">vs</div>
                <div className="text-center">
                    <p className="text-xs uppercase tracking-wider text-pr-ivory-dim">
                        {t("team")} B
                    </p>
                    <p className="font-display text-5xl text-pr-red">{view.scores.B}</p>
                </div>
            </div>
            <button
                type="button"
                onClick={clearGame}
                className="rounded-xl bg-pr-blue px-8 py-3 font-display text-lg text-pr-white shadow"
            >
                {t("playAgain")}
            </button>
        </div>
    );
}
