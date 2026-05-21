import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    DndContext,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import { useGameStore } from "../state/gameStore.js";
import type { PlayMove, Side, Tile as TileT } from "../engine/types.js";
import { validMoves } from "../engine/moves.js";
import { equals, tileFromString, tileToString } from "../engine/tiles.js";
import { Chain } from "./Chain.js";
import { Hand } from "./Hand.js";
import { OpponentRow } from "./OpponentRow.js";
import { ScoreBar } from "./ScoreBar.js";
import type { Rotation } from "./Tile.js";
import { useT } from "../i18n/index.js";

export function Board() {
    const state = useGameStore((s) => s.state);
    const humanPlayerId = useGameStore((s) => s.humanPlayerId);
    const submitHumanMove = useGameStore((s) => s.submitHumanMove);
    const aiThinking = useGameStore((s) => s.aiThinking);
    const t = useT();

    const [selectedTile, setSelectedTile] = useState<TileT | null>(null);
    const [rotations, setRotations] = useState<ReadonlyMap<string, Rotation>>(new Map());

    // Activation constraints so taps are clicks (not accidental drags). Pointer (mouse) needs an
    // 8px move to start dragging; touch needs a 180ms hold so taps don't fire drags.
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    );

    const rotateBy = useCallback((tile: TileT, delta: 90 | -90) => {
        setRotations((prev) => {
            const next = new Map(prev);
            const id = tileToString(tile);
            const current = next.get(id) ?? 0;
            // Normalize to 0/90/180/270 in [0, 360).
            const raw = (current + delta + 360) % 360;
            const normalized = raw as Rotation;
            next.set(id, normalized);
            return next;
        });
    }, []);

    // Mouse wheel: scroll up = rotate counter-clockwise (left, -90°); scroll down = clockwise (+90°).
    // Throttled to ~one step per 200ms so a trackpad swipe doesn't spin through every angle.
    const lastWheelRef = useRef(0);
    const onWheelRotate = useCallback(
        (tile: TileT, deltaY: number) => {
            if (Math.abs(deltaY) < 4) return;
            const now = Date.now();
            if (now - lastWheelRef.current < 200) return;
            lastWheelRef.current = now;
            setSelectedTile(tile);
            rotateBy(tile, deltaY < 0 ? -90 : 90);
        },
        [rotateBy],
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "r" && e.key !== "R") return;
            if (selectedTile === null) return;
            // Ignore when typing in an input/textarea (none today, but be safe).
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName ?? "";
            if (tag === "INPUT" || tag === "TEXTAREA") return;
            e.preventDefault();
            // R rotates clockwise; Shift+R counter-clockwise.
            rotateBy(selectedTile, e.shiftKey ? -90 : 90);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedTile, rotateBy]);

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

    const sidesForSelected = useMemo<Side[]>(() => {
        if (selectedTile === null) return [];
        return humanMoves
            .filter((m): m is PlayMove => m.kind === "play" && equals(m.tile, selectedTile))
            .map((m) => m.side);
    }, [humanMoves, selectedTile]);

    if (state === null || humanPlayerId === null) return null;

    const humanHand = state.hands[humanPlayerId as unknown as string] ?? [];
    const mustPass = isHumanTurn && humanMoves.length === 1 && humanMoves[0]!.kind === "pass";

    const onTileSelect = (tile: TileT): void => {
        if (!isHumanTurn) return;
        // Tapping a tile selects it; tapping the same tile again deselects.
        // Drag or tap a drop zone to play. No auto-play on tap so the user has time to rotate.
        setSelectedTile((prev) => (prev !== null && equals(prev, tile) ? null : tile));
    };

    const onRotateSelected = (): void => {
        if (selectedTile === null) return;
        rotateBy(selectedTile, 90);
    };

    const playOnSide = (side: Side): void => {
        if (selectedTile === null) return;
        const move = humanMoves.find(
            (m): m is PlayMove => m.kind === "play" && equals(m.tile, selectedTile) && m.side === side,
        );
        if (move === undefined) return;
        submitHumanMove(move);
        setSelectedTile(null);
    };

    const onDragEnd = (e: DragEndEvent): void => {
        const tileId = String(e.active.id);
        const overId = e.over?.id;
        if (overId === undefined) return;
        const tile = (() => {
            try {
                return tileFromString(tileId);
            } catch {
                return null;
            }
        })();
        if (tile === null) return;
        const side: Side = overId === "drop-left" ? "left" : "right";
        const move = humanMoves.find(
            (m): m is PlayMove => m.kind === "play" && equals(m.tile, tile) && m.side === side,
        );
        if (move === undefined) return;
        submitHumanMove(move);
        setSelectedTile(null);
    };

    const onPass = (): void => {
        if (!mustPass) return;
        submitHumanMove({ kind: "pass", playerId: humanPlayerId });
    };

    const canDropLeft = sidesForSelected.includes("left") || sidesForSelected.length === 0;
    const canDropRight = sidesForSelected.includes("right") || sidesForSelected.length === 0;
    // When a tile is selected, only show the legal drop zones. Otherwise enable both if there's any play.
    const anyPlay = humanMoves.some((m) => m.kind === "play");
    const canLeft = selectedTile !== null ? sidesForSelected.includes("left") : anyPlay && canDropLeft;
    const canRight = selectedTile !== null ? sidesForSelected.includes("right") : anyPlay && canDropRight;

    // Map seat positions to visual table positions. Turn order is counter-clockwise (PR
    // convention) with seat 0 = south (me). So seat 1 is west (visual left), seat 2 is north
    // (across / my partner), seat 3 is east (visual right).
    const seatByPosition = (pos: number) => state.seats.find((s) => s.position === pos);
    const leftSeat = seatByPosition(1);
    const topSeat = seatByPosition(2);
    const rightSeat = seatByPosition(3);
    const renderOpponent = (
        seat: typeof state.seats[number] | undefined,
        placement: "top" | "left" | "right",
    ) => {
        if (seat === undefined) return null;
        const hand = state.hands[seat.playerId as unknown as string] ?? [];
        const isCurrent = state.seats[state.turnIndex]?.playerId === seat.playerId;
        return (
            <OpponentRow
                seat={seat}
                handCount={hand.length}
                isCurrentTurn={isCurrent}
                isAiThinking={isCurrent && aiThinking}
                placement={placement}
            />
        );
    };

    return (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="flex flex-1 flex-col gap-3">
                <ScoreBar state={state} />

                {/* Partner across the table */}
                <div>{renderOpponent(topSeat, "top")}</div>

                {/* Left opponent | Chain (center) | Right opponent */}
                <div className="my-1 grid flex-1 grid-cols-[auto_1fr_auto] items-stretch gap-2">
                    <div>{renderOpponent(leftSeat, "left")}</div>
                    <div className="min-w-0">
                        <Chain
                            chain={state.chain}
                            canDropLeft={isHumanTurn && canLeft}
                            canDropRight={isHumanTurn && canRight}
                            onTapLeft={() => playOnSide("left")}
                            onTapRight={() => playOnSide("right")}
                        />
                    </div>
                    <div>{renderOpponent(rightSeat, "right")}</div>
                </div>

                {/* Turn banner */}
                <div className="flex items-center justify-between rounded-xl bg-pr-coal-soft/40 px-3 py-2 text-sm">
                    <span className="text-pr-ivory-dim">
                        {isHumanTurn
                            ? mustPass
                                ? t("noLegalPlay")
                                : t("yourTurn")
                            : aiThinking
                              ? t("aiThinking", {
                                    name: state.seats[state.turnIndex]?.displayName ?? "?",
                                })
                              : t("isPlaying", {
                                    name: state.seats[state.turnIndex]?.displayName ?? "?",
                                })}
                    </span>
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

                {/* Hand */}
                <Hand
                    hand={humanHand}
                    playable={playableTiles}
                    selectedTile={selectedTile}
                    rotations={rotations}
                    isHumanTurn={isHumanTurn}
                    onSelect={onTileSelect}
                    onRotate={onRotateSelected}
                    onWheelRotate={onWheelRotate}
                />
            </div>
        </DndContext>
    );
}
