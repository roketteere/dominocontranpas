import type { Pip, Tile as TileT } from "../engine/types.js";

// [col_frac, row_frac] within the half-tile square.
// col: 0=left, 0.5=center, 1=right.  row: 0=top, 0.5=middle, 1=bottom.
const PIP_POS: Record<Pip, ReadonlyArray<readonly [number, number]>> = {
    0: [],
    1: [[0.5, 0.5]],
    2: [[0.75, 0.25], [0.25, 0.75]],
    3: [[0.75, 0.25], [0.5, 0.5], [0.25, 0.75]],
    4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.25, 0.25], [0.25, 0.5], [0.25, 0.75], [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]],
};

// Half-tile size (px). Vertical tile dimensions: halfPx × (2×halfPx + divider).
const HALF: Record<"sm" | "md" | "lg", number> = { sm: 22, md: 32, lg: 48 };
const DIVIDER = 2;
const CORNER = 5;
const PAD_FRAC = 0.15; // inner padding as fraction of halfPx
const R_FRAC = 0.105;  // pip dot radius as fraction of halfPx

export type Rotation = 0 | 90 | 180 | 270;

export type TileProps = {
    tile: TileT;
    orientation?: "horizontal" | "vertical";
    size?: "sm" | "md" | "lg";
    selected?: boolean;
    faceDown?: boolean;
    rotation?: Rotation;
    className?: string;
};

// Renders pip dots for one half of the tile as SVG circles.
// ox/oy is the top-left corner of the half-tile region inside the SVG.
function Pips({ pip, h, ox, oy }: { pip: Pip; h: number; ox: number; oy: number }) {
    const pad = h * PAD_FRAC;
    const inner = h - 2 * pad;
    const r = h * R_FRAC;
    return (
        <>
            {PIP_POS[pip].map(([col, row], i) => (
                <circle
                    key={i}
                    cx={ox + pad + col * inner}
                    cy={oy + pad + row * inner}
                    r={r}
                    fill="#1a1a1a"
                />
            ))}
        </>
    );
}

export function Tile({
    tile,
    orientation = "horizontal",
    size = "md",
    selected = false,
    faceDown = false,
    rotation = 0,
    className = "",
}: TileProps) {
    const h = HALF[size];
    const d = DIVIDER;
    const isVert = orientation === "vertical";
    const svgW = isVert ? h : h * 2 + d;
    const svgH = isVert ? h * 2 + d : h;

    const style: React.CSSProperties = {
        transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center",
        transition: "transform 0.2s ease-out",
        display: "block",
    };

    if (faceDown) {
        return (
            <svg
                width={svgW}
                height={svgH}
                viewBox={`0 0 ${svgW} ${svgH}`}
                style={style}
                className={className}
            >
                <rect
                    x={0.75} y={0.75} width={svgW - 1.5} height={svgH - 1.5}
                    rx={CORNER} ry={CORNER}
                    fill="#003a99" stroke="#1a1a1a" strokeWidth={1.5}
                />
                <rect
                    x={4} y={4} width={svgW - 8} height={svgH - 8}
                    rx={CORNER - 2} ry={CORNER - 2}
                    fill="none" stroke="#0050f0" strokeWidth={1.5}
                />
                {selected && (
                    <rect
                        x={0.75} y={0.75} width={svgW - 1.5} height={svgH - 1.5}
                        rx={CORNER} ry={CORNER}
                        fill="none" stroke="#a3e635" strokeWidth={2.5}
                    />
                )}
            </svg>
        );
    }

    const [p0x, p0y, p1x, p1y] = isVert
        ? [0, 0, 0, h + d]
        : [0, 0, h + d, 0];

    return (
        <svg
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            style={style}
            className={className}
        >
            {/* Tile background */}
            <rect
                x={0.75} y={0.75} width={svgW - 1.5} height={svgH - 1.5}
                rx={CORNER} ry={CORNER}
                fill="#f5ecd9" stroke="#1a1a1a" strokeWidth={1.5}
            />

            {/* Divider line between the two halves */}
            {isVert ? (
                <line x1={4} y1={h + d / 2} x2={svgW - 4} y2={h + d / 2}
                    stroke="#1a1a1a" strokeWidth={1} />
            ) : (
                <line x1={h + d / 2} y1={4} x2={h + d / 2} y2={svgH - 4}
                    stroke="#1a1a1a" strokeWidth={1} />
            )}

            {/* Pips — each half is its own coordinate origin */}
            <Pips pip={tile[0]} h={h} ox={p0x} oy={p0y} />
            <Pips pip={tile[1]} h={h} ox={p1x} oy={p1y} />

            {/* Selection ring */}
            {selected && (
                <rect
                    x={0.75} y={0.75} width={svgW - 1.5} height={svgH - 1.5}
                    rx={CORNER} ry={CORNER}
                    fill="none" stroke="#a3e635" strokeWidth={2.5}
                />
            )}
        </svg>
    );
}
