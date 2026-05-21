import type { PlayerSeat, Tile as TileT } from "../engine/types.js";
import { tile as makeTile } from "../engine/tiles.js";
import { PlayerAvatar } from "./PlayerAvatar.js";
import { Tile } from "./Tile.js";
import { useT } from "../i18n/index.js";

export type Placement = "top" | "left" | "right" | "row";

type OpponentRowProps = {
    seat: PlayerSeat;
    handCount: number;
    isCurrentTurn: boolean;
    isAiThinking: boolean;
    placement: Placement;
    avatarId?: string | null;
    // When true, render a horizontal row of face-down mini-tiles beneath the avatar so the
    // player can visualize the opponent's hand size as actual face-down dominoes. Defaults
    // false to keep callers that don't opt in unchanged.
    showTiles?: boolean;
};

// Placeholder tile used purely for face-down rendering — pip values are ignored when
// faceDown=true in Tile.tsx.
const PLACEHOLDER_TILE: TileT = makeTile(0, 0);

// Compact circular chip + optional face-down tile row. Team color is the ring on the avatar;
// the tile count badge sits in the corner; "★" badge appears when the player has immunity
// (1 tile left). When showTiles is true a horizontal strip of face-down xs-size tiles renders
// underneath, one per tile in the opponent's hand.
export function OpponentRow({
    seat,
    handCount,
    isCurrentTurn,
    isAiThinking,
    placement,
    avatarId,
    showTiles = false,
}: OpponentRowProps) {
    const t = useT();
    const statusLabel = isCurrentTurn
        ? isAiThinking
            ? t("thinking")
            : t("playing")
        : null;
    const size = placement === "top" || placement === "row" ? "md" : "md";
    const label = statusLabel !== null ? `${seat.displayName} · ${statusLabel}` : seat.displayName;
    return (
        <div className="flex flex-col items-center gap-1">
            <PlayerAvatar
                avatarId={avatarId ?? null}
                team={seat.team}
                size={size}
                tileCount={handCount}
                active={isCurrentTurn}
                label={label}
                immune={handCount === 1}
            />
            {showTiles && handCount > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-0.5 max-w-[10rem]">
                    {Array.from({ length: handCount }).map((_, i) => (
                        <Tile
                            key={i}
                            tile={PLACEHOLDER_TILE}
                            orientation="vertical"
                            size="xs"
                            faceDown
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
