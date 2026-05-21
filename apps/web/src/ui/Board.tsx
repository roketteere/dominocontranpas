import { useEffect, useMemo, useState } from "react";
import {
    DndContext,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import { useGameStore } from "../state/gameStore.js";
import type { PlayMove, Side, Tile as TileT } from "../engine/types.js";
import { validMoves } from "../engine/moves.js";
import { equals } from "../engine/tiles.js";
import { Chain } from "./Chain.js";
import { Hand } from "./Hand.js";
import { OpponentRow } from "./OpponentRow.js";
import { ScoreBar } from "./ScoreBar.js";
import { Tile } from "./Tile.js";
import { useT } from "../i18n/index.js";

// Two-step flow: idle → selected (tile chosen, waiting for chain-end tap).
// Drag-and-drop bypasses the tap-select step entirely.
type PlacementStep = "idle" | "selected";

// Solo opponents are seeded by gameStore.startSoloMatch with hardcoded names. Pin their avatars
// to PR-themed icons so the table feels like local play, not faceless bots. 1v1 solo means only
// position 1 (Tito) is used; positions 2/3 stay for any future return of 4p-vs-AI.
function soloOpponentAvatar(position: number): string {
    if (position === 1) return "rooster"; // Tito — jíbaro flavor
    if (position === 2) return "maracas"; // hypothetical 4p partner
    if (position === 3) return "dancer"; // hypothetical 4p opponent
    return "coqui";
}

export function Board() {
    const state = useGameStore((s) => s.state);
    const humanPlayerId = useGameStore((s) => s.humanPlayerId);
    const submitHumanMove = useGameStore((s) => s.submitHumanMove);
    const aiThinking = useGameStore((s) => s.aiThinking);
    const lang = useGameStore((s) => s.lang);
    const t = useT();

    const [step, setStep] = useState<PlacementStep>("idle");
    const [pendingTile, setPendingTile] = useState<TileT | null>(null);
    const [shaking, setShaking] = useState(false);
    const [yourTurnToast, setYourTurnToast] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    );

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
    const mustDraw = isHumanTurn && humanMoves.length === 1 && humanMoves[0]!.kind === "draw";
    const boneyardCount = state?.boneyard.length ?? 0;
    const anyPlay = humanMoves.some((m) => m.kind === "play");

    // Shake hand when forced to pass.
    useEffect(() => {
        if (!isHumanTurn || !mustPass) return;
        setShaking(true);
        const id = setTimeout(() => setShaking(false), 600);
        return () => clearTimeout(id);
    }, [isHumanTurn, mustPass]);

    // Abort in-progress selection if the turn passes away.
    useEffect(() => {
        if (!isHumanTurn) {
            setStep("idle");
            setPendingTile(null);
        }
    }, [isHumanTurn]);

    // "Your turn!" toast whenever the human's turn begins.
    useEffect(() => {
        if (!isHumanTurn || mustPass) return;
        setYourTurnToast(true);
        const id = setTimeout(() => setYourTurnToast(false), 1800);
        return () => clearTimeout(id);
    }, [isHumanTurn]); // eslint-disable-line react-hooks/exhaustive-deps

    if (state === null || humanPlayerId === null) return null;

    const humanHand = state.hands[humanPlayerId as unknown as string] ?? [];

    // Which chain ends accept the pending tile (or any play when idle).
    const canLeft = (() => {
        if (!isHumanTurn) return false;
        if (pendingTile !== null)
            return humanMoves.some(
                (m) => m.kind === "play" && equals(m.tile, pendingTile) && m.side === "left",
            );
        return anyPlay;
    })();

    const canRight = (() => {
        if (!isHumanTurn) return false;
        if (pendingTile !== null)
            return humanMoves.some(
                (m) => m.kind === "play" && equals(m.tile, pendingTile) && m.side === "right",
            );
        return anyPlay;
    })();

    // --- event handlers ---

    const shake = () => {
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
    };

    const submitTileAndSide = (tile: TileT, side: Side): boolean => {
        const move = humanMoves.find(
            (m): m is PlayMove =>
                m.kind === "play" && equals(m.tile, tile) && m.side === side,
        );
        if (!move) { shake(); return false; }
        submitHumanMove(move);
        setStep("idle");
        setPendingTile(null);
        return true;
    };

    const onTileTap = (tile: TileT): void => {
        if (!isHumanTurn) return;
        const isPlayable = playableTiles.some((p) => equals(p, tile));
        if (!isPlayable) { shake(); return; }
        // If the same tile is tapped again, deselect it.
        if (pendingTile !== null && equals(pendingTile, tile)) {
            setStep("idle");
            setPendingTile(null);
            return;
        }
        setPendingTile(tile);
        setStep("selected");
    };

    const onPickSide = (side: Side): void => {
        if (pendingTile === null) return;
        submitTileAndSide(pendingTile, side);
    };

    const onCancelSelection = (): void => {
        setStep("idle");
        setPendingTile(null);
    };

    const onPass = (): void => {
        if (!mustPass) return;
        submitHumanMove({ kind: "pass", playerId: humanPlayerId });
    };

    const onDraw = (): void => {
        if (!mustDraw || state === null || humanPlayerId === null) return;
        const head = state.boneyard[0];
        if (head === undefined) return;
        submitHumanMove({ kind: "draw", playerId: humanPlayerId, tile: head });
    };

    // DnD handlers — drag sets pendingTile for chain-end highlighting, drop submits.
    const onDragStart = ({ active }: DragStartEvent) => {
        if (!isHumanTurn) return;
        const tile = active.data.current?.tile as TileT | undefined;
        if (tile) setPendingTile(tile);
    };

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        const tile = active.data.current?.tile as TileT | undefined;
        if (over && tile && isHumanTurn) {
            const side: Side = over.id === "drop-left" ? "left" : "right";
            submitTileAndSide(tile, side);
        } else {
            // Drag ended without a valid drop; restore tap-selected state if any.
            if (step !== "selected") setPendingTile(null);
        }
    };

    const onDragCancel = () => {
        if (step !== "selected") setPendingTile(null);
    };

    // Opponent layout.
    const seatByPos = (pos: number) => state.seats.find((s) => s.position === pos);
    const orderedOpponents = [seatByPos(1), seatByPos(2), seatByPos(3)].filter(
        (s): s is NonNullable<typeof s> => s !== undefined,
    );

    const turnMessage = (() => {
        if (isHumanTurn) {
            if (mustDraw) return t("mustDraw");
            if (mustPass) return t("noLegalPlay");
            if (step === "selected") return "";
            return lang === "es" ? "Arrastra o toca una ficha verde" : "Drag or tap a green tile";
        }
        if (aiThinking) return t("aiThinking", { name: state.seats[state.turnIndex]?.displayName ?? "?" });
        return t("isPlaying", { name: state.seats[state.turnIndex]?.displayName ?? "?" });
    })();

    return (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
            <div className="flex flex-1 flex-col gap-3">
                <ScoreBar state={state} />

                <div className="flex items-start justify-around gap-2">
                    {orderedOpponents.map((s) => (
                        <OpponentRow
                            key={s.position}
                            seat={s}
                            handCount={(state.hands[s.playerId as unknown as string] ?? []).length}
                            isCurrentTurn={state.seats[state.turnIndex]?.playerId === s.playerId}
                            isAiThinking={state.seats[state.turnIndex]?.playerId === s.playerId && aiThinking}
                            placement="row"
                            avatarId={soloOpponentAvatar(s.position)}
                        />
                    ))}
                </div>

                <div className="my-1 flex-1">
                    <Chain
                        chain={state.chain}
                        canDropLeft={canLeft}
                        canDropRight={canRight}
                        onTapLeft={() => onPickSide("left")}
                        onTapRight={() => onPickSide("right")}
                    />
                </div>

                {/* Info / staged-tile bar */}
                {step === "selected" && pendingTile !== null ? (
                    <div className="flex items-center gap-3 rounded-xl bg-pr-coal-soft/50 px-3 py-2">
                        <Tile tile={pendingTile} orientation="vertical" size="sm" selected />
                        <span className="flex-1 text-sm text-pr-ivory-dim">
                            {lang === "es" ? "Toca un extremo →" : "Tap a chain end →"}
                        </span>
                        <button
                            type="button"
                            onClick={onCancelSelection}
                            className="rounded-lg border border-pr-coal-soft/70 px-3 py-1 text-xs text-pr-ivory-dim hover:bg-pr-coal-soft/60"
                        >
                            {lang === "es" ? "Cancelar" : "Cancel"}
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between rounded-xl bg-pr-coal-soft/40 px-3 py-2 text-sm">
                        <span className="text-pr-ivory-dim">
                            {turnMessage}
                            {boneyardCount > 0 && (
                                <span className="ml-2 text-[10px] uppercase tracking-wider text-pr-coqui">
                                    {t("boneyard")} · {boneyardCount}
                                </span>
                            )}
                        </span>
                        {mustDraw && (
                            <button
                                type="button"
                                onClick={onDraw}
                                className="rounded-lg bg-pr-coqui px-3 py-1 font-display text-sm text-pr-coal"
                            >
                                {t("draw")}
                            </button>
                        )}
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

                {/* Hand — shakes on forced pass or unplayable tap */}
                <div className={shaking ? "dct-shake" : ""}>
                    <Hand
                        hand={humanHand}
                        playable={playableTiles}
                        selectedTile={pendingTile}
                        isHumanTurn={isHumanTurn}
                        onSelect={onTileTap}
                    />
                </div>
            </div>

            {/* "Your turn!" toast */}
            <div
                className="pointer-events-none fixed inset-x-0 top-20 z-20 flex justify-center transition-opacity duration-500"
                style={{ opacity: yourTurnToast ? 1 : 0 }}
            >
                <div className="rounded-full bg-pr-coqui px-6 py-2 font-display text-lg text-pr-coal shadow-lg">
                    {lang === "es" ? "¡Tu turno!" : "Your turn!"}
                </div>
            </div>
        </DndContext>
    );
}
