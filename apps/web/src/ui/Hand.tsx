import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Hand as HandT, Tile as TileT } from "../engine/types.js";
import { Tile } from "./Tile.js";
import { tileToString } from "../engine/tiles.js";
import { useGameStore } from "../state/gameStore.js";
import { equals } from "../engine/tiles.js";

function DraggableTile({
    tile,
    canPlay,
    selected,
    onClick,
    humanTurn,
}: {
    tile: TileT;
    canPlay: boolean;
    selected: boolean;
    onClick: () => void;
    humanTurn: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: tileToString(tile),
        disabled: !canPlay,
        data: { tile },
    });

    // Playable tiles are raised; unplayable tiles stay at baseline and are subtly dimmed.
    // No colored glow — elevation alone signals "this can be played."
    const elevated = canPlay && humanTurn && !isDragging;
    const dndOffset = CSS.Translate.toString(transform);
    const elevateY = elevated ? "translateY(-12px)" : "";

    const style: React.CSSProperties = {
        transform: [dndOffset, elevateY].filter(Boolean).join(" ") || undefined,
        opacity: isDragging ? 0.55 : 1,
        cursor: canPlay ? (isDragging ? "grabbing" : "grab") : humanTurn ? "not-allowed" : "default",
        touchAction: "none",
        padding: "4px",
        transition: isDragging ? "none" : "transform 0.15s ease-out",
    };

    return (
        <button
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            type="button"
            {...attributes}
            {...listeners}
        >
            <Tile
                tile={tile}
                orientation="vertical"
                size="lg"
                selected={selected}
                dim={!canPlay && humanTurn}
            />
        </button>
    );
}

type HandProps = {
    hand: HandT;
    playable: ReadonlyArray<TileT>;
    selectedTile: TileT | null;
    isHumanTurn: boolean;
    onSelect: (tile: TileT) => void;
};

export function Hand({ hand, playable, selectedTile, isHumanTurn, onSelect }: HandProps) {
    const lang = useGameStore((s) => s.lang);

    return (
        <div
            className="flex flex-col gap-2 rounded-2xl p-3"
            style={{
                background: "linear-gradient(180deg, var(--color-pr-wood-light) 0%, var(--color-pr-wood) 100%)",
                boxShadow: "inset 0 6px 12px rgba(0,0,0,0.35), inset 0 -2px 4px rgba(255,255,255,0.06), 0 4px 8px rgba(0,0,0,0.3)",
            }}
        >
            <div
                className="flex flex-wrap items-center justify-center gap-3 rounded-xl p-3"
                style={{
                    background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.04) 20%, transparent 35%)",
                }}
            >
                {hand.map((tile) => {
                    const canPlay = playable.some((p) => equals(p, tile));
                    const isSelected = selectedTile !== null && equals(selectedTile, tile);
                    return (
                        <DraggableTile
                            key={tileToString(tile)}
                            tile={tile}
                            canPlay={canPlay}
                            selected={isSelected}
                            humanTurn={isHumanTurn}
                            onClick={() => onSelect(tile)}
                        />
                    );
                })}
            </div>
            <p className="px-1 text-center text-[11px] text-pr-ivory/70">
                {isHumanTurn
                    ? lang === "es"
                        ? "Arrastra una ficha verde · o tócala para seleccionar"
                        : "Drag a green tile · or tap to select"
                    : ""}
            </p>
        </div>
    );
}
