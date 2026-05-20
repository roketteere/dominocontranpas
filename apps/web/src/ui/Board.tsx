import { useMemo, useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { useGameStore } from "../state/gameStore.js";
import type { PlayMove, Side, Tile as TileT } from "../engine/types.js";
import { validMoves } from "../engine/moves.js";
import { equals, tileFromString } from "../engine/tiles.js";
import { Chain } from "./Chain.js";
import { Hand } from "./Hand.js";
import { OpponentRow } from "./OpponentRow.js";
import { ScoreBar } from "./ScoreBar.js";

export function Board() {
    const state = useGameStore((s) => s.state);
    const humanPlayerId = useGameStore((s) => s.humanPlayerId);
    const submitHumanMove = useGameStore((s) => s.submitHumanMove);
    const aiThinking = useGameStore((s) => s.aiThinking);

    const [selectedTile, setSelectedTile] = useState<TileT | null>(null);

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
        setSelectedTile((prev) => (prev !== null && equals(prev, tile) ? null : tile));
        // If exactly one side is legal for this tile, auto-play on tap.
        const sides = humanMoves
            .filter((m): m is PlayMove => m.kind === "play" && equals(m.tile, tile))
            .map((m) => m.side);
        if (sides.length === 1) {
            submitHumanMove({
                kind: "play",
                playerId: humanPlayerId,
                tile,
                side: sides[0]!,
            });
            setSelectedTile(null);
        }
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

    return (
        <DndContext onDragEnd={onDragEnd}>
            <div className="flex flex-1 flex-col gap-3">
                <ScoreBar state={state} />

                {/* Opponents grid */}
                <div className="grid gap-2">
                    {state.seats
                        .filter((s) => s.playerId !== humanPlayerId)
                        .map((seat, idx) => {
                            const hand = state.hands[seat.playerId as unknown as string] ?? [];
                            const isCurrent =
                                state.seats[state.turnIndex]?.playerId === seat.playerId;
                            return (
                                <OpponentRow
                                    key={`${seat.position}-${idx}`}
                                    seat={seat}
                                    handCount={hand.length}
                                    isCurrentTurn={isCurrent}
                                    isAiThinking={isCurrent && aiThinking}
                                />
                            );
                        })}
                </div>

                {/* Chain */}
                <div className="my-2 flex-1">
                    <Chain
                        chain={state.chain}
                        canDropLeft={isHumanTurn && canLeft}
                        canDropRight={isHumanTurn && canRight}
                    />
                </div>

                {/* Turn banner */}
                <div className="flex items-center justify-between rounded-xl bg-pr-coal-soft/40 px-3 py-2 text-sm">
                    <span className="text-pr-ivory-dim">
                        {isHumanTurn
                            ? mustPass
                                ? "No legal play — you must pass."
                                : "Your turn. Drag a tile to one of the chain ends."
                            : `${state.seats[state.turnIndex]?.displayName ?? "?"} is playing…`}
                    </span>
                    {mustPass && (
                        <button
                            type="button"
                            onClick={onPass}
                            className="rounded-lg bg-pr-red px-3 py-1 font-display text-sm text-pr-white"
                        >
                            Pass
                        </button>
                    )}
                </div>

                {/* Hand */}
                <Hand
                    hand={humanHand}
                    playable={playableTiles}
                    selectedTile={selectedTile}
                    onSelect={onTileSelect}
                />
            </div>
        </DndContext>
    );
}
