import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Hand as HandT, Tile as TileT } from "../engine/types.js";
import { Tile, type Rotation } from "./Tile.js";
import { tileToString } from "../engine/tiles.js";
import { useT } from "../i18n/index.js";

function DraggableTile({
    tile,
    canPlay,
    onClick,
    onWheel,
    selected,
    rotation,
    humanTurn,
}: {
    tile: TileT;
    canPlay: boolean;
    onClick: () => void;
    onWheel: (e: React.WheelEvent) => void;
    selected: boolean;
    rotation: Rotation;
    humanTurn: boolean;
}) {
    const id = tileToString(tile);
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id,
        disabled: !canPlay,
        data: { tile },
    });
    // On the human's turn: green halo for playable, red for unplayable. Off-turn: neutral.
    let glow: string | undefined;
    if (humanTurn) {
        if (canPlay) {
            glow =
                "0 0 14px 2px rgba(163, 230, 53, 0.6), 0 0 4px rgba(163, 230, 53, 0.9)";
        } else {
            glow = "0 0 10px 2px rgba(206, 17, 38, 0.55)";
        }
    }
    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.7 : 1,
        cursor: canPlay ? "grab" : humanTurn ? "not-allowed" : "default",
        filter: humanTurn && !canPlay ? "saturate(0.55) brightness(0.85)" : undefined,
        boxShadow: glow,
        borderRadius: "0.5rem",
    };
    return (
        <button
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            onWheel={onWheel}
            className={`touch-none transition-transform ${canPlay ? "hover:-translate-y-1" : ""}`}
            {...attributes}
            {...listeners}
            type="button"
        >
            <Tile
                tile={tile}
                orientation="vertical"
                size="lg"
                selected={selected}
                rotation={rotation}
            />
        </button>
    );
}

type HandProps = {
    hand: HandT;
    playable: ReadonlyArray<TileT>;
    selectedTile: TileT | null;
    rotations: ReadonlyMap<string, Rotation>;
    isHumanTurn: boolean;
    onSelect: (tile: TileT) => void;
    onRotate: () => void;
    onWheelRotate: (tile: TileT, deltaY: number) => void;
};

export function Hand({
    hand,
    playable,
    selectedTile,
    rotations,
    isHumanTurn,
    onSelect,
    onRotate,
    onWheelRotate,
}: HandProps) {
    const t = useT();
    const isPlayable = (tile: TileT) => playable.some((p) => p[0] === tile[0] && p[1] === tile[1]);
    const isSelected = (tile: TileT) =>
        selectedTile !== null && selectedTile[0] === tile[0] && selectedTile[1] === tile[1];
    const rotationOf = (tile: TileT): Rotation => rotations.get(tileToString(tile)) ?? 0;
    return (
        <div className="flex flex-col gap-2 rounded-2xl p-3 shadow-inner"
            style={{
                background:
                    "linear-gradient(180deg, var(--color-pr-wood-light) 0%, var(--color-pr-wood) 100%)",
                boxShadow:
                    "inset 0 6px 12px rgba(0,0,0,0.35), inset 0 -2px 4px rgba(255,255,255,0.06), 0 4px 8px rgba(0,0,0,0.3)",
            }}
        >
            <div
                className="flex flex-wrap items-end justify-center gap-3 rounded-xl p-3"
                style={{
                    // A subtle inset "groove" along the top edge so tiles look seated on the rail.
                    background:
                        "linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.05) 18%, transparent 32%)",
                }}
            >
                {hand.map((tile) => (
                    <DraggableTile
                        key={tileToString(tile)}
                        tile={tile}
                        canPlay={isPlayable(tile)}
                        selected={isSelected(tile)}
                        rotation={rotationOf(tile)}
                        humanTurn={isHumanTurn}
                        onClick={() => onSelect(tile)}
                        onWheel={(e) => onWheelRotate(tile, e.deltaY)}
                    />
                ))}
            </div>
            <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-pr-ivory">
                <span className="text-pr-ivory/80">
                    {selectedTile === null ? t("tapToSelect") : t("selectedHint")}
                </span>
                <button
                    type="button"
                    onClick={onRotate}
                    disabled={selectedTile === null}
                    aria-label={t("rotate")}
                    className="flex items-center gap-1 rounded-lg border border-pr-coal-soft/70 bg-pr-coal-soft/70 px-3 py-1 font-display text-pr-ivory transition-opacity hover:bg-pr-coal-soft disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <span aria-hidden>↻</span>
                    <span>
                        {t("rotate")} <span className="opacity-60">{t("rotateShortcut")}</span>
                    </span>
                </button>
            </div>
        </div>
    );
}
