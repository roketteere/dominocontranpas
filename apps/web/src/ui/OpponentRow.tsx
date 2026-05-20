import type { PlayerSeat } from "../engine/types.js";
import { Tile } from "./Tile.js";
import { tile as makeTile } from "../engine/tiles.js";
import { useT } from "../i18n/index.js";

const PLACEHOLDER = makeTile(0, 0); // not rendered as a face; just satisfies the Tile type

type OpponentRowProps = {
    seat: PlayerSeat;
    handCount: number;
    isCurrentTurn: boolean;
    isAiThinking: boolean;
};

export function OpponentRow({ seat, handCount, isCurrentTurn, isAiThinking }: OpponentRowProps) {
    const t = useT();
    const accent = seat.team === "A" ? "border-pr-blue" : "border-pr-red";
    const tileWord = handCount === 1 ? t("tileSingular") : t("tiles");
    const statusWord = isCurrentTurn ? (isAiThinking ? t("thinking") : t("playing")) : null;
    return (
        <div
            className={`flex items-center justify-between gap-3 rounded-xl border-l-4 ${accent} bg-pr-coal-soft/40 px-3 py-2`}
        >
            <div className="flex flex-col">
                <span className="font-display text-sm text-pr-ivory">{seat.displayName}</span>
                <span className="text-[10px] uppercase tracking-wider text-pr-ivory-dim">
                    {t("team")} {seat.team} · {handCount} {tileWord}
                    {statusWord !== null ? ` · ${statusWord}` : ""}
                </span>
            </div>
            <div className="flex items-center gap-0.5">
                {Array.from({ length: Math.min(handCount, 7) }).map((_, i) => (
                    <Tile key={i} tile={PLACEHOLDER} orientation="vertical" size="sm" faceDown />
                ))}
                {handCount === 1 && (
                    <span className="ml-1 text-[10px] font-bold text-pr-coqui">{t("immune")}</span>
                )}
            </div>
        </div>
    );
}
