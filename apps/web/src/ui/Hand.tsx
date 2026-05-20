import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Hand as HandT, Tile as TileT } from "../engine/types.js";
import { Tile } from "./Tile.js";
import { tileToString } from "../engine/tiles.js";

function DraggableTile({
    tile,
    canPlay,
    onClick,
    selected,
}: {
    tile: TileT;
    canPlay: boolean;
    onClick: () => void;
    selected: boolean;
}) {
    const id = tileToString(tile);
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id,
        disabled: !canPlay,
        data: { tile },
    });
    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.7 : 1,
        cursor: canPlay ? "grab" : "not-allowed",
    };
    return (
        <button
            ref={setNodeRef}
            style={style}
            onClick={canPlay ? onClick : undefined}
            className={`touch-none transition-transform ${canPlay ? "hover:-translate-y-1" : "grayscale"}`}
            {...attributes}
            {...listeners}
            type="button"
        >
            <Tile tile={tile} orientation="vertical" size="lg" selected={selected} />
        </button>
    );
}

type HandProps = {
    hand: HandT;
    playable: ReadonlyArray<TileT>;
    selectedTile: TileT | null;
    onSelect: (tile: TileT) => void;
};

export function Hand({ hand, playable, selectedTile, onSelect }: HandProps) {
    const isPlayable = (t: TileT) => playable.some((p) => p[0] === t[0] && p[1] === t[1]);
    const isSelected = (t: TileT) => selectedTile !== null && selectedTile[0] === t[0] && selectedTile[1] === t[1];
    return (
        <div className="flex flex-wrap items-end justify-center gap-2 rounded-2xl bg-pr-coal-soft/40 p-3">
            {hand.map((t) => (
                <DraggableTile
                    key={tileToString(t)}
                    tile={t}
                    canPlay={isPlayable(t)}
                    selected={isSelected(t)}
                    onClick={() => onSelect(t)}
                />
            ))}
            {hand.length === 0 && (
                <p className="px-2 py-3 text-sm text-pr-ivory-dim">No tiles — round over!</p>
            )}
        </div>
    );
}
