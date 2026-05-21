import type { Tile as TileT, Pip } from "../engine/types.js";
import { useGameStore } from "../state/gameStore.js";

// Centered modal shown when the user has tapped a playable tile. Renders the tile big with
// each pip face as a giant tap target. Picking one closes the modal and tells the parent which
// pip the user intends to match against the chain.
export function PlacementModal({
    tile,
    validPips,
    onPickPip,
    onCancel,
}: {
    tile: TileT;
    /** Pips on this tile that match at least one chain end. Pips not in this set are dimmed. */
    validPips: ReadonlySet<Pip>;
    onPickPip: (pipIndex: 0 | 1) => void;
    onCancel: () => void;
}) {
    const lang = useGameStore((s) => s.lang);
    const pip0 = tile[0];
    const pip1 = tile[1];
    const canPlayPip0 = validPips.has(pip0);
    const canPlayPip1 = validPips.has(pip1);
    return (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-pr-table-dark/85 px-6 py-4">
            <p className="mb-4 text-center text-sm uppercase tracking-wider text-pr-ivory">
                {lang === "es" ? "Elige qué número jugar" : "Pick which number to play"}
            </p>
            <div className="flex w-full max-w-xs flex-col overflow-hidden rounded-2xl border-2 border-pr-coal-soft bg-pr-ivory shadow-2xl">
                <button
                    type="button"
                    onClick={() => canPlayPip0 && onPickPip(0)}
                    disabled={!canPlayPip0}
                    aria-label={`Play with ${pip0}`}
                    className={`flex h-40 items-center justify-center transition-colors ${canPlayPip0 ? "bg-pr-ivory text-pr-coal active:bg-pr-coqui/30" : "bg-pr-ivory-dim/40 text-pr-coal-soft"}`}
                >
                    <PipBigGlyph value={pip0} />
                </button>
                <div className="h-[2px] w-full bg-pr-coal-soft" />
                <button
                    type="button"
                    onClick={() => canPlayPip1 && onPickPip(1)}
                    disabled={!canPlayPip1}
                    aria-label={`Play with ${pip1}`}
                    className={`flex h-40 items-center justify-center transition-colors ${canPlayPip1 ? "bg-pr-ivory text-pr-coal active:bg-pr-coqui/30" : "bg-pr-ivory-dim/40 text-pr-coal-soft"}`}
                >
                    <PipBigGlyph value={pip1} />
                </button>
            </div>
            <button
                type="button"
                onClick={onCancel}
                className="mt-6 rounded-xl border border-pr-coal-soft bg-pr-coal-soft/50 px-6 py-2 font-display text-pr-ivory hover:bg-pr-coal-soft"
            >
                {lang === "es" ? "Cancelar" : "Cancel"}
            </button>
        </div>
    );
}

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

function PipBigGlyph({ value }: { value: Pip }) {
    const dots = PIP_LAYOUTS[value];
    if (dots.length === 0) {
        return <div className="h-24 w-24" />;
    }
    return (
        <div
            className="relative grid h-28 w-28"
            style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "repeat(3, 1fr)",
            }}
        >
            {dots.map(([row, col], i) => (
                <span
                    key={i}
                    className="h-5 w-5 rounded-full bg-pr-coal"
                    style={{
                        gridRow: row + 1,
                        gridColumn: col + 1,
                        placeSelf: "center",
                    }}
                />
            ))}
        </div>
    );
}
