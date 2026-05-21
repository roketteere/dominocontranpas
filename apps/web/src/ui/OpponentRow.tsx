import type { PlayerSeat } from "../engine/types.js";
import { PlayerAvatar } from "./PlayerAvatar.js";
import { useT } from "../i18n/index.js";

export type Placement = "top" | "left" | "right" | "row";

type OpponentRowProps = {
    seat: PlayerSeat;
    handCount: number;
    isCurrentTurn: boolean;
    isAiThinking: boolean;
    placement: Placement;
    avatarId?: string | null;
};

// Compact circular chip. Replaces the old name+tile-back row; mobile-first sizing. Team color
// is the ring on the avatar; the tile count badge sits in the corner; "★" badge appears when
// the player has immunity (1 tile left).
export function OpponentRow({
    seat,
    handCount,
    isCurrentTurn,
    isAiThinking,
    placement,
    avatarId,
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
        <PlayerAvatar
            avatarId={avatarId ?? null}
            team={seat.team}
            size={size}
            tileCount={handCount}
            active={isCurrentTurn}
            label={label}
            immune={handCount === 1}
        />
    );
}
