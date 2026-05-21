import { useEffect, useState } from "react";
import type { Tile as TileT, Pip } from "../engine/types.js";
import { useGameStore } from "../state/gameStore.js";

// Full-screen guided overlay for picking which pip to play.
// The domino is shown large and centered; each half is a big tap target.
// A step hint fades out after 2 s so it doesn't clutter repeat plays.
export function PlacementModal({
    tile,
    validPips,
    onPickPip,
    onCancel,
}: {
    tile: TileT;
    validPips: ReadonlySet<Pip>;
    onPickPip: (pipIndex: 0 | 1) => void;
    onCancel: () => void;
}) {
    const lang = useGameStore((s) => s.lang);
    const [hintVisible, setHintVisible] = useState(true);

    useEffect(() => {
        const id = setTimeout(() => setHintVisible(false), 2000);
        return () => clearTimeout(id);
    }, []);

    const pip0 = tile[0];
    const pip1 = tile[1];
    const can0 = validPips.has(pip0);
    const can1 = validPips.has(pip1);

    return (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-pr-table-dark/92 px-6">
            <p
                className="mb-6 text-center text-sm uppercase tracking-wider text-pr-coqui transition-opacity duration-700"
                style={{ opacity: hintVisible ? 1 : 0 }}
            >
                {lang === "es" ? "¿Cuál número jugar?" : "Pick which number to play"}
            </p>

            {/* Big domino — two tall half-buttons */}
            <div className="flex w-full max-w-[190px] flex-col overflow-hidden rounded-3xl border-[3px] border-pr-coal shadow-2xl">
                <HalfButton pip={pip0} valid={can0} onPick={() => can0 && onPickPip(0)} />
                <div className="h-[3px] w-full bg-pr-coal" />
                <HalfButton pip={pip1} valid={can1} onPick={() => can1 && onPickPip(1)} />
            </div>

            <button
                type="button"
                onClick={onCancel}
                className="mt-8 rounded-xl border border-pr-coal-soft bg-pr-coal-soft/60 px-8 py-2 font-display text-pr-ivory hover:bg-pr-coal-soft"
            >
                {lang === "es" ? "Cancelar" : "Cancel"}
            </button>
        </div>
    );
}

function HalfButton({ pip, valid, onPick }: { pip: Pip; valid: boolean; onPick: () => void }) {
    return (
        <button
            type="button"
            onClick={onPick}
            disabled={!valid}
            aria-label={`${pip}`}
            className={`flex h-36 items-center justify-center transition-colors ${
                valid
                    ? "bg-pr-ivory active:bg-lime-100"
                    : "cursor-not-allowed bg-pr-coal-soft/40"
            }`}
            style={valid ? { boxShadow: "inset 0 0 0 3px rgba(163,230,53,0.45)" } : undefined}
        >
            <PipBigGlyph value={pip} valid={valid} />
        </button>
    );
}

const PIP_LAYOUTS: Record<Pip, ReadonlyArray<readonly [number, number]>> = {
    0: [],
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function PipBigGlyph({ value, valid }: { value: Pip; valid: boolean }) {
    const dots = PIP_LAYOUTS[value];
    if (dots.length === 0) {
        return (
            <div className="flex h-28 w-28 items-center justify-center">
                <span className={`font-display text-5xl ${valid ? "text-pr-coal" : "text-pr-coal-soft"}`}>
                    0
                </span>
            </div>
        );
    }
    return (
        <div
            className="relative grid"
            style={{
                width: 112,
                height: 112,
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "repeat(3, 1fr)",
            }}
        >
            {dots.map(([row, col], i) => (
                <span
                    key={i}
                    className={`rounded-full ${valid ? "bg-pr-coal" : "bg-pr-coal-soft/50"}`}
                    style={{
                        gridRow: row + 1,
                        gridColumn: col + 1,
                        width: 20,
                        height: 20,
                        placeSelf: "center",
                    }}
                />
            ))}
        </div>
    );
}
