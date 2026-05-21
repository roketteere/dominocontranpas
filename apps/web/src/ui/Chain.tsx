import { useDroppable } from "@dnd-kit/core";
import type { Chain as ChainT, PlacedTile } from "../engine/types.js";
import { Tile } from "./Tile.js";
import { equals } from "../engine/tiles.js";

type ChainProps = {
    chain: ChainT;
    canDropLeft: boolean;
    canDropRight: boolean;
    onTapLeft?: () => void;
    onTapRight?: () => void;
};

function PlacedTileView({ placed }: { placed: PlacedTile }) {
    // Doubles play perpendicular to the chain direction for the traditional PR look.
    const orientation = placed.leftPip === placed.rightPip ? "vertical" : "horizontal";
    // The normalized tile has tile[0] <= tile[1]. If the placement put the higher pip on the
    // visual left (placed.leftPip === tile[1]), we rotate 180° so the matching pip touches the
    // neighboring tile's matching pip.
    const rotation = placed.tile[0] === placed.leftPip ? 0 : 180;
    return <Tile tile={placed.tile} orientation={orientation} size="md" rotation={rotation} />;
}

function DropZone({
    id,
    active,
    label,
    onTap,
}: {
    id: string;
    active: boolean;
    label: string;
    onTap?: (() => void) | undefined;
}) {
    const { isOver, setNodeRef } = useDroppable({ id, disabled: !active });
    return (
        <button
            ref={setNodeRef}
            type="button"
            onClick={active ? onTap : undefined}
            disabled={!active}
            className={`flex h-16 min-w-14 items-center justify-center rounded-xl border-2 text-base font-bold transition-all ${
                active
                    ? isOver
                        ? "border-pr-coqui bg-pr-coqui/30 text-pr-coqui scale-110"
                        : "border-lime-400 bg-lime-400/10 text-lime-400 dct-pulse"
                    : "border-transparent text-transparent"
            }`}
        >
            {active ? label : ""}
        </button>
    );
}

export function Chain({ chain, canDropLeft, canDropRight, onTapLeft, onTapRight }: ChainProps) {
    if (chain.tiles.length === 0) {
        return (
            <div className="flex h-full min-h-32 items-center justify-center rounded-xl bg-pr-table-dark/40 p-4">
                <DropZone
                    id="drop-left"
                    active={canDropLeft || canDropRight}
                    label="Play"
                    onTap={onTapLeft}
                />
            </div>
        );
    }
    return (
        <div className="flex h-full min-h-32 items-center justify-center rounded-xl bg-pr-table-dark/40 p-3">
            <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
                <DropZone id="drop-left" active={canDropLeft} label="←" onTap={onTapLeft} />
                {chain.tiles.map((p, i) => (
                    <PlacedTileView
                        key={`${i}-${p.tile[0]}-${p.tile[1]}-${p.turnNumber}`}
                        placed={p}
                    />
                ))}
                <DropZone id="drop-right" active={canDropRight} label="→" onTap={onTapRight} />
            </div>
        </div>
    );
}

export { equals }; // re-export for convenience in callers if needed
