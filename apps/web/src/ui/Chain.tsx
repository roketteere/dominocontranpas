import { useDroppable } from "@dnd-kit/core";
import type { Chain as ChainT, PlacedTile } from "../engine/types.js";
import { Tile } from "./Tile.js";
import { equals, tile as makeTile } from "../engine/tiles.js";

type ChainProps = {
    chain: ChainT;
    canDropLeft: boolean;
    canDropRight: boolean;
};

function PlacedTileView({ placed }: { placed: PlacedTile }) {
    // Doubles play perpendicular to the chain direction for the traditional PR look.
    const orientation = placed.leftPip === placed.rightPip ? "vertical" : "horizontal";
    // Reconstruct the tile so the leftPip is on the left.
    const displayTile =
        placed.tile[0] === placed.leftPip
            ? placed.tile
            : makeTile(placed.rightPip, placed.leftPip);
    return <Tile tile={displayTile} orientation={orientation} size="sm" />;
}

function DropZone({
    id,
    active,
    label,
}: {
    id: string;
    active: boolean;
    label: string;
}) {
    const { isOver, setNodeRef } = useDroppable({ id, disabled: !active });
    return (
        <div
            ref={setNodeRef}
            className={`flex h-10 min-w-12 items-center justify-center rounded-md border-2 border-dashed text-[10px] uppercase tracking-wider transition-colors ${
                active
                    ? isOver
                        ? "border-pr-coqui bg-pr-coqui/20 text-pr-coqui"
                        : "border-pr-ivory-dim bg-pr-ivory/10 text-pr-ivory-dim"
                    : "border-pr-coal-soft text-transparent"
            }`}
        >
            {active ? label : ""}
        </div>
    );
}

export function Chain({ chain, canDropLeft, canDropRight }: ChainProps) {
    if (chain.tiles.length === 0) {
        return (
            <div className="flex items-center justify-center gap-1 rounded-xl bg-pr-table-dark/40 p-3">
                <DropZone id="drop-left" active={canDropLeft || canDropRight} label="Play" />
            </div>
        );
    }
    return (
        <div className="flex flex-wrap items-center justify-center gap-1 rounded-xl bg-pr-table-dark/40 p-3">
            <DropZone id="drop-left" active={canDropLeft} label="←" />
            {chain.tiles.map((p, i) => (
                <PlacedTileView key={`${i}-${p.tile[0]}-${p.tile[1]}-${p.turnNumber}`} placed={p} />
            ))}
            <DropZone id="drop-right" active={canDropRight} label="→" />
        </div>
    );
}

export { equals }; // re-export for convenience in callers if needed
