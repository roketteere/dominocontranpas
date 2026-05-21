import type { Pip, Tile as TileT } from "../engine/types.js";

// Position offsets for pip dots inside a 3x3 grid on each half of the tile.
const PIP_LAYOUTS: Record<Pip, ReadonlyArray<readonly [number, number]>> = {
    0: [],
    1: [[1, 1]],
    2: [
        [0, 0],
        [2, 2],
    ],
    3: [
        [0, 0],
        [1, 1],
        [2, 2],
    ],
    4: [
        [0, 0],
        [0, 2],
        [2, 0],
        [2, 2],
    ],
    5: [
        [0, 0],
        [0, 2],
        [1, 1],
        [2, 0],
        [2, 2],
    ],
    6: [
        [0, 0],
        [0, 2],
        [1, 0],
        [1, 2],
        [2, 0],
        [2, 2],
    ],
};

function PipFace({ value, dotSize }: { value: Pip; dotSize: number }) {
    const dots = PIP_LAYOUTS[value];
    return (
        <div
            className="relative grid p-1"
            style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "repeat(3, 1fr)",
                width: "100%",
                aspectRatio: "1 / 1",
            }}
        >
            {dots.map(([row, col], i) => (
                <span
                    key={i}
                    className="rounded-full bg-pr-coal"
                    style={{
                        gridRow: row + 1,
                        gridColumn: col + 1,
                        width: `${dotSize}px`,
                        height: `${dotSize}px`,
                        placeSelf: "center",
                    }}
                />
            ))}
        </div>
    );
}

export type Rotation = 0 | 90 | 180 | 270;

export type TileProps = {
    tile: TileT;
    orientation?: "horizontal" | "vertical";
    size?: "sm" | "md" | "lg";
    selected?: boolean;
    faceDown?: boolean;
    /** CSS rotation in degrees. The tile's bounding box stays the same; only the visual spins. */
    rotation?: Rotation;
    className?: string;
};

const SIZE_CLASSES: Record<NonNullable<TileProps["size"]>, string> = {
    sm: "w-12 h-6",
    md: "w-16 h-8",
    lg: "w-24 h-12",
};

const SIZE_VERTICAL: Record<NonNullable<TileProps["size"]>, string> = {
    sm: "w-6 h-12",
    md: "w-8 h-16",
    lg: "w-12 h-24",
};

const DOT_PX: Record<NonNullable<TileProps["size"]>, number> = {
    sm: 3,
    md: 4,
    lg: 6,
};

export function Tile({
    tile,
    orientation = "horizontal",
    size = "md",
    selected = false,
    faceDown = false,
    rotation = 0,
    className = "",
}: TileProps) {
    const sizeCls = orientation === "horizontal" ? SIZE_CLASSES[size] : SIZE_VERTICAL[size];
    const ringCls = selected ? "ring-2 ring-pr-coqui" : "";
    const rotateStyle: React.CSSProperties = {
        transform: `rotate(${rotation}deg)`,
        transition: "transform 0.2s ease-out",
    };
    if (faceDown) {
        return (
            <div
                className={`${sizeCls} ${ringCls} ${className} rounded-md border border-pr-coal-soft bg-pr-blue-dark shadow-md`}
                style={{
                    ...rotateStyle,
                    backgroundImage:
                        "repeating-linear-gradient(45deg, var(--color-pr-blue) 0 4px, var(--color-pr-blue-dark) 4px 8px)",
                }}
            />
        );
    }
    const dotPx = DOT_PX[size];
    const dividerClass = orientation === "horizontal" ? "h-px w-full" : "w-px h-full";
    // tile[0] is rendered in the first half (left for horizontal, top for vertical), tile[1] in
    // the second. CSS rotation handles every visual reorientation (90° increments). No pip-swap.
    return (
        <div
            className={`${sizeCls} ${ringCls} ${className} flex ${orientation === "horizontal" ? "flex-row" : "flex-col"} rounded-md border border-pr-coal-soft bg-pr-ivory shadow-md overflow-hidden`}
            style={rotateStyle}
        >
            <div className="flex flex-1 items-center justify-center bg-pr-ivory">
                <PipFace value={tile[0]} dotSize={dotPx} />
            </div>
            <div className={`${dividerClass} bg-pr-coal-soft`} />
            <div className="flex flex-1 items-center justify-center bg-pr-ivory">
                <PipFace value={tile[1]} dotSize={dotPx} />
            </div>
        </div>
    );
}
