import type { Pip, Tile as TileT } from "../engine/types.js";

const PIP_POS: Record<Pip, ReadonlyArray<readonly [number, number]>> = {
    0: [],
    1: [[0.5, 0.5]],
    2: [[0.75, 0.25], [0.25, 0.75]],
    3: [[0.75, 0.25], [0.5, 0.5], [0.25, 0.75]],
    4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.25, 0.25], [0.25, 0.5], [0.25, 0.75], [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]],
};

const HALF: Record<"sm" | "md" | "lg", number> = { sm: 22, md: 32, lg: 48 };
const DIVIDER = 2;
const CORNER = 5;
const PAD_FRAC = 0.15;
const R_FRAC = 0.105;

export type Rotation = 0 | 90 | 180 | 270;

export type TileProps = {
    tile: TileT;
    orientation?: "horizontal" | "vertical";
    size?: "sm" | "md" | "lg";
    selected?: boolean;
    faceDown?: boolean;
    rotation?: Rotation;
    dim?: boolean;      // subtle desaturation for unplayable tiles — no glow
    className?: string;
};

function Pips({ pip, h, ox, oy, dim }: { pip: Pip; h: number; ox: number; oy: number; dim?: boolean }) {
    const pad = h * PAD_FRAC;
    const inner = h - 2 * pad;
    const r = h * R_FRAC;
    const fill = dim ? "#6b6550" : "#1a1a1a";
    return (
        <>
            {PIP_POS[pip].map(([col, row], i) => (
                <circle
                    key={i}
                    cx={ox + pad + col * inner}
                    cy={oy + pad + row * inner}
                    r={r}
                    fill={fill}
                />
            ))}
        </>
    );
}

// Depth shadow only — no colored glow. Playable/unplayable distinction is
// handled by elevation (translateY) on the wrapper in Hand.tsx.
function tileFilter(dim: boolean): string {
    const depth = "drop-shadow(0px 3px 5px rgba(0,0,0,0.55)) drop-shadow(0px 1px 2px rgba(0,0,0,0.4))";
    return dim ? `${depth} saturate(0.5) brightness(0.82)` : depth;
}

export function Tile({
    tile,
    orientation = "horizontal",
    size = "md",
    selected = false,
    faceDown = false,
    rotation = 0,
    dim = false,
    className = "",
}: TileProps) {
    const h = HALF[size];
    const d = DIVIDER;
    const isVert = orientation === "vertical";
    const svgW = isVert ? h : h * 2 + d;
    const svgH = isVert ? h * 2 + d : h;

    const style: React.CSSProperties = {
        display: "block",
        overflow: "visible",
        filter: tileFilter(dim),
        transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center",
        transition: "transform 0.2s ease-out",
    };

    if (faceDown) {
        return (
            <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={style} className={className}>
                <rect x={0.75} y={0.75} width={svgW - 1.5} height={svgH - 1.5}
                    rx={CORNER} ry={CORNER} fill="#003a99" stroke="#1a1a1a" strokeWidth={2} />
                <rect x={4} y={4} width={svgW - 8} height={svgH - 8}
                    rx={CORNER - 2} ry={CORNER - 2} fill="none" stroke="#0050f0" strokeWidth={1.5} />
                {selected && (
                    <rect x={0.75} y={0.75} width={svgW - 1.5} height={svgH - 1.5}
                        rx={CORNER} ry={CORNER} fill="none" stroke="#a3e635" strokeWidth={2.5} />
                )}
            </svg>
        );
    }

    const [p0x, p0y, p1x, p1y] = isVert ? [0, 0, 0, h + d] : [0, 0, h + d, 0];
    // Ivory gradient: lighter at top-left, slightly warmer at bottom-right.
    const bgFill = dim ? "#d4ccb8" : "#f5ecd9";
    const borderStroke = dim ? "#4a4a3a" : "#1a1a1a";

    return (
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={style} className={className}>
            {/* Tile base — slightly inset so the stroke stays fully inside the viewBox */}
            <rect x={0.75} y={0.75} width={svgW - 1.5} height={svgH - 1.5}
                rx={CORNER} ry={CORNER} fill={bgFill} stroke={borderStroke} strokeWidth={2} />

            {/* Subtle highlight along the top edge for a slightly 3-D feel */}
            {!dim && (
                <rect x={2} y={2} width={svgW - 4} height={Math.min(h * 0.25, 8)}
                    rx={CORNER - 1} ry={CORNER - 1}
                    fill="rgba(255,255,255,0.35)" />
            )}

            {/* Divider */}
            {isVert
                ? <line x1={4} y1={h + d / 2} x2={svgW - 4} y2={h + d / 2} stroke={borderStroke} strokeWidth={1.5} />
                : <line x1={h + d / 2} y1={4} x2={h + d / 2} y2={svgH - 4} stroke={borderStroke} strokeWidth={1.5} />
            }

            <Pips pip={tile[0]} h={h} ox={p0x} oy={p0y} dim={dim} />
            <Pips pip={tile[1]} h={h} ox={p1x} oy={p1y} dim={dim} />

            {selected && (
                <rect x={0.75} y={0.75} width={svgW - 1.5} height={svgH - 1.5}
                    rx={CORNER} ry={CORNER} fill="none" stroke="#a3e635" strokeWidth={3} />
            )}
        </svg>
    );
}
