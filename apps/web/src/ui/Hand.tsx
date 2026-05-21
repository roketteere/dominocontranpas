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
}: {
    tile: TileT;
    canPlay: boolean;
    onClick: () => void;
    onWheel: (e: React.WheelEvent) => void;
    selected: boolean;
    rotation: Rotation;
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
            onClick={onClick}
            onWheel={onWheel}
            className={`touch-none transition-transform ${canPlay ? "hover:-translate-y-1" : "grayscale"}`}
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
    onSelect: (tile: TileT) => void;
    onRotate: () => void;
    onWheelRotate: (tile: TileT, deltaY: number) => void;
};

export function Hand({
    hand,
    playable,
    selectedTile,
    rotations,
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
        <div className="flex flex-col gap-2 rounded-2xl bg-pr-coal-soft/40 p-3">
            <div className="flex flex-wrap items-end justify-center gap-2">
                {hand.map((tile) => (
                    <DraggableTile
                        key={tileToString(tile)}
                        tile={tile}
                        canPlay={isPlayable(tile)}
                        selected={isSelected(tile)}
                        rotation={rotationOf(tile)}
                        onClick={() => onSelect(tile)}
                        onWheel={(e) => onWheelRotate(tile, e.deltaY)}
                    />
                ))}
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] text-pr-ivory-dim">
                <span>{selectedTile === null ? t("tapToSelect") : t("selectedHint")}</span>
                <button
                    type="button"
                    onClick={onRotate}
                    disabled={selectedTile === null}
                    aria-label={t("rotate")}
                    className="flex items-center gap-1 rounded-lg border border-pr-coal-soft bg-pr-coal-soft/60 px-3 py-1 font-display text-pr-ivory transition-opacity hover:bg-pr-coal-soft disabled:cursor-not-allowed disabled:opacity-40"
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
