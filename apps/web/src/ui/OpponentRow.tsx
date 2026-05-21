import type { PlayerSeat } from "../engine/types.js";
import { Tile } from "./Tile.js";
import { tile as makeTile } from "../engine/tiles.js";
import { useT } from "../i18n/index.js";

const PLACEHOLDER = makeTile(0, 0); // not rendered as a face; just satisfies the Tile type

export type Placement = "top" | "left" | "right";

type OpponentRowProps = {
    seat: PlayerSeat;
    handCount: number;
    isCurrentTurn: boolean;
    isAiThinking: boolean;
    placement: Placement;
};

export function OpponentRow({
    seat,
    handCount,
    isCurrentTurn,
    isAiThinking,
    placement,
}: OpponentRowProps) {
    const t = useT();
    const accent = seat.team === "A" ? "border-pr-blue" : "border-pr-red";
    const tileWord = handCount === 1 ? t("tileSingular") : t("tiles");
    const statusWord = isCurrentTurn ? (isAiThinking ? t("thinking") : t("playing")) : null;
    const isActive = isCurrentTurn;
    const activeRing = isActive ? "ring-2 ring-pr-coqui/60" : "";

    if (placement === "top") {
        return (
            <div
                className={`flex items-center justify-between gap-3 rounded-xl border-l-4 ${accent} ${activeRing} bg-pr-coal-soft/40 px-3 py-2`}
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
                        <Tile
                            key={i}
                            tile={PLACEHOLDER}
                            orientation="vertical"
                            size="sm"
                            faceDown
                        />
                    ))}
                    {handCount === 1 && (
                        <span className="ml-1 text-[10px] font-bold text-pr-coqui">
                            {t("immune")}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // Side placements: vertical column with the name on top and tiles stacked underneath.
    const borderSide = placement === "left" ? "border-r-4" : "border-l-4";
    return (
        <div
            className={`flex h-full flex-col items-center gap-2 rounded-xl ${borderSide} ${accent} ${activeRing} bg-pr-coal-soft/40 px-2 py-3`}
            style={{ minWidth: "4.5rem" }}
        >
            <div className="flex flex-col items-center">
                <span className="font-display text-xs text-pr-ivory">{seat.displayName}</span>
                <span className="text-[9px] uppercase tracking-wider text-pr-ivory-dim">
                    {t("team")} {seat.team}
                </span>
                <span className="text-[9px] text-pr-ivory-dim">
                    {handCount} {tileWord}
                </span>
                {statusWord !== null && (
                    <span className="text-[9px] uppercase tracking-wider text-pr-coqui">
                        {statusWord}
                    </span>
                )}
            </div>
            <div className="flex flex-col items-center gap-0.5">
                {Array.from({ length: Math.min(handCount, 7) }).map((_, i) => (
                    <Tile key={i} tile={PLACEHOLDER} orientation="horizontal" size="sm" faceDown />
                ))}
                {handCount === 1 && (
                    <span className="mt-1 text-[9px] font-bold text-pr-coqui">{t("immune")}</span>
                )}
            </div>
        </div>
    );
}
