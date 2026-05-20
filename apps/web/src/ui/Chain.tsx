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
    // visual left (placed.leftPip === tile[1]), we need to flip the visual rendering so the
    // matching pip touches the neighboring tile's matching pip.
    const flipped = placed.tile[0] !== placed.leftPip;
    return <Tile tile={placed.tile} orientation={orientation} size="sm" flipped={flipped} />;
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
            className={`flex h-10 min-w-12 items-center justify-center rounded-md border-2 border-dashed text-[10px] uppercase tracking-wider transition-colors ${
                active
                    ? isOver
                        ? "border-pr-coqui bg-pr-coqui/20 text-pr-coqui"
                        : "border-pr-ivory-dim bg-pr-ivory/10 text-pr-ivory-dim hover:bg-pr-ivory/20"
                    : "border-pr-coal-soft text-transparent"
            }`}
        >
            {active ? label : ""}
        </button>
    );
}

export function Chain({ chain, canDropLeft, canDropRight, onTapLeft, onTapRight }: ChainProps) {
    if (chain.tiles.length === 0) {
        return (
            <div className="flex items-center justify-center gap-1 rounded-xl bg-pr-table-dark/40 p-3">
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
        <div className="flex flex-wrap items-center justify-center gap-1 rounded-xl bg-pr-table-dark/40 p-3">
            <DropZone id="drop-left" active={canDropLeft} label="←" onTap={onTapLeft} />
            {chain.tiles.map((p, i) => (
                <PlacedTileView key={`${i}-${p.tile[0]}-${p.tile[1]}-${p.turnNumber}`} placed={p} />
            ))}
            <DropZone id="drop-right" active={canDropRight} label="→" onTap={onTapRight} />
        </div>
    );
}

export { equals }; // re-export for convenience in callers if needed
