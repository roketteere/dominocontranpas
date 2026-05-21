import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../state/gameStore.js";
import type { PlayMove, Side, Tile as TileT, Pip } from "../engine/types.js";
import { validMoves } from "../engine/moves.js";
import { equals } from "../engine/tiles.js";
import { Chain } from "./Chain.js";
import { Hand } from "./Hand.js";
import { OpponentRow } from "./OpponentRow.js";
import { ScoreBar } from "./ScoreBar.js";
import { Tile } from "./Tile.js";
import type { Rotation } from "./Tile.js";
import { useT } from "../i18n/index.js";
import { PlacementModal } from "./PlacementModal.js";

type PlacementStep = "idle" | "picking-pip" | "picking-side";

export function Board() {
    const state = useGameStore((s) => s.state);
    const humanPlayerId = useGameStore((s) => s.humanPlayerId);
    const submitHumanMove = useGameStore((s) => s.submitHumanMove);
    const aiThinking = useGameStore((s) => s.aiThinking);
    const lang = useGameStore((s) => s.lang);
    const t = useT();

    const [step, setStep] = useState<PlacementStep>("idle");
    const [pendingTile, setPendingTile] = useState<TileT | null>(null);
    const [pickedPipIdx, setPickedPipIdx] = useState<0 | 1 | null>(null);
    const [shaking, setShaking] = useState(false);
    const [yourTurnToast, setYourTurnToast] = useState(false);
    const [sideHintVisible, setSideHintVisible] = useState(false);

    const isHumanTurn = useMemo(() => {
        if (state === null || humanPlayerId === null) return false;
        const seat = state.seats[state.turnIndex];
        return seat !== undefined && seat.playerId === humanPlayerId;
    }, [state, humanPlayerId]);

    const humanMoves = useMemo(() => {
        if (state === null || humanPlayerId === null) return [];
        return isHumanTurn ? validMoves(state, humanPlayerId) : [];
    }, [state, humanPlayerId, isHumanTurn]);

    const playableTiles = useMemo(() => {
        const tiles: TileT[] = [];
        for (const m of humanMoves) {
            if (m.kind !== "play") continue;
            if (!tiles.some((t) => equals(t, m.tile))) tiles.push(m.tile);
        }
        return tiles;
    }, [humanMoves]);

    const mustPass = isHumanTurn && humanMoves.length === 1 && humanMoves[0]!.kind === "pass";

    // Shake the hand once when the player is forced to pass.
    useEffect(() => {
        if (!isHumanTurn || !mustPass) return;
        setShaking(true);
        const id = setTimeout(() => setShaking(false), 600);
        return () => clearTimeout(id);
    }, [isHumanTurn, mustPass]);

    // If the turn changes away from the human while a placement is in progress, abort it.
    useEffect(() => {
        if (!isHumanTurn) {
            setStep("idle");
            setPendingTile(null);
            setPickedPipIdx(null);
        }
    }, [isHumanTurn]);

    // Brief "Your turn!" toast whenever it becomes the human's turn.
    useEffect(() => {
        if (!isHumanTurn || mustPass) return;
        setYourTurnToast(true);
        const id = setTimeout(() => setYourTurnToast(false), 1800);
        return () => clearTimeout(id);
    }, [isHumanTurn]); // eslint-disable-line react-hooks/exhaustive-deps

    if (state === null || humanPlayerId === null) return null;

    const humanHand = state.hands[humanPlayerId as unknown as string] ?? [];

    // Pips on `pendingTile` that match at least one chain end.
    const validPipsForPending: ReadonlySet<Pip> = (() => {
        if (pendingTile === null) return new Set();
        const out = new Set<Pip>();
        const ends: (Pip | null)[] = [state.chain.leftEnd, state.chain.rightEnd];
        for (const end of ends) {
            if (end === null) {
                // Empty chain: any pip is valid as an opening tile.
                out.add(pendingTile[0]);
                out.add(pendingTile[1]);
                break;
            }
            if (pendingTile[0] === end) out.add(pendingTile[0]);
            if (pendingTile[1] === end) out.add(pendingTile[1]);
        }
        return out;
    })();

    // Once a pip is picked, which side(s) can it play on?
    const sidesForPickedPip: Side[] = (() => {
        if (pendingTile === null || pickedPipIdx === null) return [];
        const pickedPip = pendingTile[pickedPipIdx];
        const sides: Side[] = [];
        const leftEnd = state.chain.leftEnd;
        const rightEnd = state.chain.rightEnd;
        if (leftEnd === null || leftEnd === pickedPip) sides.push("left");
        if (rightEnd === null || rightEnd === pickedPip) {
            // For the empty-chain opener leftEnd is null AND rightEnd is null; we already added
            // "left" above, so guard against duplicating.
            if (!sides.includes("right")) sides.push("right");
        }
        return sides;
    })();

    const onTileTap = (tile: TileT): void => {
        if (!isHumanTurn) return;
        const isPlayable = playableTiles.some((p) => equals(p, tile));
        if (!isPlayable) {
            // Tapping an unplayable tile gives a tiny shake to remind them.
            setShaking(true);
            setTimeout(() => setShaking(false), 400);
            return;
        }
        setPendingTile(tile);
        setPickedPipIdx(null);
        setStep("picking-pip");
    };

    const onPickPip = (idx: 0 | 1): void => {
        setPickedPipIdx(idx);
        setStep("picking-side");
        setSideHintVisible(true);
        setTimeout(() => setSideHintVisible(false), 2000);
    };

    const onCancelPlacement = (): void => {
        setStep("idle");
        setPendingTile(null);
        setPickedPipIdx(null);
    };

    const onPickSide = (side: Side): void => {
        if (pendingTile === null || pickedPipIdx === null) return;
        if (!sidesForPickedPip.includes(side)) {
            // Mismatch — that side doesn't accept this pip. Shake for feedback.
            setShaking(true);
            setTimeout(() => setShaking(false), 400);
            return;
        }
        // Validate against the engine's actual move list (belt + suspenders).
        const move = humanMoves.find(
            (m): m is PlayMove =>
                m.kind === "play" && equals(m.tile, pendingTile) && m.side === side,
        );
        if (move === undefined) {
            setShaking(true);
            setTimeout(() => setShaking(false), 400);
            return;
        }
        submitHumanMove(move);
        setStep("idle");
        setPendingTile(null);
        setPickedPipIdx(null);
    };

    const onPass = (): void => {
        if (!mustPass) return;
        submitHumanMove({ kind: "pass", playerId: humanPlayerId });
    };

    // When a pip has been picked, rotate the pending tile so the picked pip is visually at the
    // top. tile[0] is at the top by default (vertical orientation). Picking tile[1] needs a
    // 180° rotation.
    const rotationsForHand: ReadonlyMap<string, Rotation> = (() => {
        if (pendingTile === null || pickedPipIdx !== 1) return new Map();
        const m = new Map<string, Rotation>();
        // We don't import tileToString here — but Hand keys by it. Instead pass a rotation
        // map keyed by the same convention. Use inline string format "a|b".
        m.set(`${pendingTile[0]}|${pendingTile[1]}`, 180);
        return m;
    })();

    // Counter-clockwise turn order: seat 0 = south (me), seat 1 = west, seat 2 = north, seat 3 = east.
    const seatByPosition = (pos: number) => state.seats.find((s) => s.position === pos);
    const orderedOpponents = [seatByPosition(1), seatByPosition(2), seatByPosition(3)].filter(
        (s): s is NonNullable<typeof s> => s !== undefined,
    );
    const renderOpponent = (seat: (typeof state.seats)[number]) => {
        const hand = state.hands[seat.playerId as unknown as string] ?? [];
        const isCurrent = state.seats[state.turnIndex]?.playerId === seat.playerId;
        return (
            <OpponentRow
                key={seat.position}
                seat={seat}
                handCount={hand.length}
                isCurrentTurn={isCurrent}
                isAiThinking={isCurrent && aiThinking}
                placement="row"
            />
        );
    };

    // Compute which chain ends can receive a drop in the current step.
    const anyPlay = humanMoves.some((m) => m.kind === "play");
    const canLeft =
        step === "picking-side"
            ? sidesForPickedPip.includes("left")
            : isHumanTurn && anyPlay;
    const canRight =
        step === "picking-side"
            ? sidesForPickedPip.includes("right")
            : isHumanTurn && anyPlay;

    const turnMessage = (() => {
        if (isHumanTurn) {
            if (mustPass) return t("noLegalPlay");
            if (step === "picking-side") return "";
            return t("yourTurn");
        }
        if (aiThinking) {
            return t("aiThinking", {
                name: state.seats[state.turnIndex]?.displayName ?? "?",
            });
        }
        return t("isPlaying", {
            name: state.seats[state.turnIndex]?.displayName ?? "?",
        });
    })();

    return (
        <>
            <div className="flex flex-1 flex-col gap-3">
                <ScoreBar state={state} />

                {/* Opponents as compact avatar chips. */}
                <div className="flex items-start justify-around gap-2">
                    {orderedOpponents.map((s) => renderOpponent(s))}
                </div>

                {/* Chain takes the full available width. */}
                <div className="my-1 flex-1">
                    <Chain
                        chain={state.chain}
                        canDropLeft={canLeft}
                        canDropRight={canRight}
                        onTapLeft={() => onPickSide("left")}
                        onTapRight={() => onPickSide("right")}
                    />
                </div>

                {step === "picking-side" && pendingTile !== null && pickedPipIdx !== null ? (
                    /* Staged tile bar — shows during picking-side step */
                    <div className="flex items-center gap-3 rounded-xl bg-pr-coal-soft/50 px-3 py-2">
                        <Tile
                            tile={pendingTile}
                            orientation="vertical"
                            size="sm"
                            rotation={pickedPipIdx === 1 ? 180 : 0}
                        />
                        <span
                            className="flex-1 text-sm text-pr-ivory transition-opacity duration-700"
                            style={{ opacity: sideHintVisible ? 1 : 0.4 }}
                        >
                            {lang === "es" ? "Toca un extremo →" : "Tap a chain end →"}
                        </span>
                        <button
                            type="button"
                            onClick={onCancelPlacement}
                            className="rounded-lg border border-pr-coal-soft/70 px-3 py-1 text-xs text-pr-ivory-dim hover:bg-pr-coal-soft/60"
                        >
                            {lang === "es" ? "Cancelar" : "Cancel"}
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between rounded-xl bg-pr-coal-soft/40 px-3 py-2 text-sm">
                        <span className="text-pr-ivory-dim">{turnMessage}</span>
                        {mustPass && (
                            <button
                                type="button"
                                onClick={onPass}
                                className="rounded-lg bg-pr-red px-3 py-1 font-display text-sm text-pr-white"
                            >
                                {t("pass")}
                            </button>
                        )}
                    </div>
                )}

                {/* Hand. Shakes briefly on forced pass or tap-of-red-tile. */}
                <div className={shaking ? "dct-shake" : ""}>
                    <Hand
                        hand={humanHand}
                        playable={playableTiles}
                        selectedTile={step === "picking-side" ? pendingTile : null}
                        rotations={rotationsForHand}
                        isHumanTurn={isHumanTurn}
                        onSelect={onTileTap}
                        onRotate={() => {
                            /* rotate-button is unused in the guided flow */
                        }}
                        onWheelRotate={() => {
                            /* wheel rotate disabled in guided flow */
                        }}
                    />
                </div>
            </div>

            {step === "picking-pip" && pendingTile !== null && (
                <PlacementModal
                    tile={pendingTile}
                    validPips={validPipsForPending}
                    onPickPip={onPickPip}
                    onCancel={onCancelPlacement}
                />
            )}

            {/* Transient "Your turn!" toast — fades in/out, pointer-events none */}
            <div
                className="pointer-events-none fixed inset-x-0 top-20 z-20 flex justify-center transition-opacity duration-500"
                style={{ opacity: yourTurnToast ? 1 : 0 }}
            >
                <div className="rounded-full bg-pr-coqui px-6 py-2 font-display text-lg text-pr-coal shadow-lg">
                    {lang === "es" ? "¡Tu turno!" : "Your turn!"}
                </div>
            </div>
        </>
    );
}
