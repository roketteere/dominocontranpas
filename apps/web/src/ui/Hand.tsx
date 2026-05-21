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

    let glow: string | undefined;
    if (humanTurn) {
        glow = canPlay
            ? "0 0 12px 2px rgba(163,230,53,0.65), 0 0 4px rgba(163,230,53,0.9)"
            : "0 0 8px 2px rgba(206,17,38,0.5)";
    }

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        cursor: canPlay ? (isDragging ? "grabbing" : "grab") : humanTurn ? "not-allowed" : "default",
        filter: humanTurn && !canPlay ? "saturate(0.45) brightness(0.8)" : undefined,
        borderRadius: "6px",
        boxShadow: glow,
        touchAction: "none",
    };

    return (
        <button
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            type="button"
            className={`transition-transform ${canPlay && !isDragging ? "hover:-translate-y-1 active:scale-95" : ""}`}
            {...attributes}
            {...listeners}
        >
            <Tile tile={tile} orientation="vertical" size="lg" selected={selected} />
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
