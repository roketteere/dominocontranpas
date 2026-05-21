import { useEffect, useMemo, useState } from "react";
import {
    DndContext,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import { useMutation } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import type {
    Chain as ChainT,
    GameState,
    Hand as HandT,
    PlacedTile,
    PlayMove,
    PlayerId,
    PlayerSeat,
    RoundOutcome,
    Side,
    Tile as TileT,
} from "../../engine/types.js";
import { validMoves } from "../../engine/moves.js";
import { equals, tile as makeTile, tileFromString, tileToString } from "../../engine/tiles.js";
import { Board as LocalBoardPanel } from "../Board.js";
import { Chain } from "../Chain.js";
import { Hand } from "../Hand.js";
import { OpponentRow } from "../OpponentRow.js";
import { ScoreBar } from "../ScoreBar.js";
import { useOnlineGame } from "../../net/useOnlineGame.js";
import { useIdentityStore } from "../../state/identityStore.js";
import { useOnlineStore } from "../../state/onlineGameStore.js";
import { useT } from "../../i18n/index.js";

// Reconstruct an engine GameState from the Convex view payload. The view already filtered
// opponent hands to counts only and masked steal events for non-involved viewers — this just
// reshapes the data into the engine's types so we can call validMoves/etc.
function viewToEngineState(view: {
    phase: string;
    mode: string;
    round: number;
    turnIndex: number;
    turnNumber: number;
    scores: { A: number; B: number };
    options: { targetScore: 100 | 150 | 200; capicuaBonus: number; chuchazoBonus: number; mode: string; enableTranpas: boolean };
    chain: ChainT;
    boneyardCount: number;
    lastOutcome: RoundOutcome | null;
    seats: { position: number; team: "A" | "B"; isAI: boolean; displayName: string }[];
    mySeatPosition: number | null;
    myHand: number[][] | null;
    opponentCounts: Record<number, number>;
    history: { kind: string; [k: string]: unknown }[];
}): { state: GameState; opponentCounts: Record<number, number>; boneyardCount: number } {
    const seats: PlayerSeat[] = view.seats.map((s) => ({
        playerId: `seat-${s.position}` as unknown as PlayerId,
        position: s.position as 0 | 1 | 2 | 3,
        team: s.team,
        isAI: s.isAI,
        displayName: s.displayName,
    }));
    const hands: Record<string, HandT> = {};
    if (view.mySeatPosition !== null && view.myHand !== null) {
        const tiles = view.myHand.map((t) => makeTile(t[0] ?? 0, t[1] ?? 0));
        hands[`seat-${view.mySeatPosition}`] = tiles;
    }
    const state: GameState = {
        phase: view.phase as GameState["phase"],
        seats,
        hands,
        chain: view.chain,
        // The server keeps the real boneyard secret (anti-cheat). For client-side validMoves to
        // return [draw] vs [pass] correctly, populate N placeholder tiles matching the count.
        // The DrawMove the engine produces will carry a placeholder tile; the server overrides
        // with the real boneyard head when the drawTile mutation runs.
        boneyard: Array.from({ length: view.boneyardCount }, () => makeTile(0, 0)),
        turnIndex: view.turnIndex,
        turnNumber: view.turnNumber,
        scores: view.scores,
        round: view.round,
        options: {
            targetScore: view.options.targetScore,
            capicuaBonus: view.options.capicuaBonus,
            chuchazoBonus: view.options.chuchazoBonus,
            mode: view.options.mode as GameState["options"]["mode"],
            enableTranpas: view.options.enableTranpas,
        },
        history: view.history as unknown as GameState["history"],
        lastActorPlayerId: null,
        lastOutcome: view.lastOutcome,
    };
    return { state, opponentCounts: view.opponentCounts, boneyardCount: view.boneyardCount };
}

export function OnlineBoard() {
    const t = useT();
    const gameId = useOnlineStore((s) => s.gameId);
    const setScreen = useOnlineStore((s) => s.setScreen);
    const { view, myUserId } = useOnlineGame(gameId);
    const playTile = useMutation(api.games.playTile);
    const passTurn = useMutation(api.games.passTurn);
    const drawTile = useMutation(api.games.drawTile);

    const [selectedTile, setSelectedTile] = useState<TileT | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    );

    // Auto-route to round_end / match_end on phase change.
    useEffect(() => {
        if (view?.phase === "round_end") setScreen("round_end");
        else if (view?.phase === "match_end") setScreen("match_end");
    }, [view?.phase, setScreen]);

    const derived = useMemo(() => {
        if (view === null || view === undefined || myUserId === null) return null;
        const { state, boneyardCount } = viewToEngineState(view);
        const mySeatPosition = view.mySeatPosition;
        if (mySeatPosition === null) return { state, opponentCounts: view.opponentCounts, boneyardCount, isMyTurn: false, playable: [], moves: [], myPid: null };
        const myPid = `seat-${mySeatPosition}` as unknown as PlayerId;
        const isMyTurn =
            view.phase === "in_round" && view.turnIndex === mySeatPosition;
        const moves = isMyTurn ? validMoves(state, myPid) : [];
        const playableSet: TileT[] = [];
        for (const m of moves) {
            if (m.kind !== "play") continue;
            if (!playableSet.some((p) => equals(p, m.tile))) playableSet.push(m.tile);
        }
        return { state, opponentCounts: view.opponentCounts, boneyardCount, isMyTurn, playable: playableSet, moves, myPid };
    }, [view, myUserId]);

    if (view === null || view === undefined || myUserId === null || derived === null) {
        return <p className="p-4 text-center text-pr-ivory-dim">…</p>;
    }

    const { state, opponentCounts, boneyardCount, isMyTurn, playable, moves, myPid } = derived;

    const myHand = state.hands[`seat-${view.mySeatPosition}`] ?? [];
    const mustPass = isMyTurn && moves.length === 1 && moves[0]!.kind === "pass";
    const mustDraw = isMyTurn && moves.length === 1 && moves[0]!.kind === "draw";

    const onTileSelect = (tile: TileT) => {
        if (!isMyTurn) return;
        setSelectedTile((prev) => (prev !== null && equals(prev, tile) ? null : tile));
    };

    const sidesForSelected: Side[] = [];
    if (selectedTile !== null) {
        for (const m of moves) {
            if (m.kind !== "play") continue;
            if (!equals(m.tile, selectedTile)) continue;
            sidesForSelected.push(m.side);
        }
    }

    const playOnSide = (side: Side) => {
        if (selectedTile === null || myPid === null || gameId === null || myUserId === null) return;
        const move = moves.find((m): m is PlayMove => {
            if (m.kind !== "play") return false;
            return equals(m.tile, selectedTile) && m.side === side;
        });
        if (move === undefined) return;
        void playTile({
            gameId,
            userId: myUserId,
            tile: [move.tile[0], move.tile[1]],
            side: move.side,
        });
        setSelectedTile(null);
    };

    const onPass = () => {
        if (!mustPass || gameId === null || myUserId === null) return;
        void passTurn({ gameId, userId: myUserId });
    };

    const onDraw = () => {
        if (!mustDraw || gameId === null || myUserId === null) return;
        void drawTile({ gameId, userId: myUserId });
    };

    const onDragEnd = (e: DragEndEvent) => {
        const tileId = String(e.active.id);
        const overId = e.over?.id;
        if (overId === undefined || myPid === null || gameId === null || myUserId === null) return;
        let tile: TileT;
        try {
            tile = tileFromString(tileId);
        } catch {
            return;
        }
        const side: Side = overId === "drop-left" ? "left" : "right";
        const move = moves.find((m): m is PlayMove => {
            if (m.kind !== "play") return false;
            return equals(m.tile, tile) && m.side === side;
        });
        if (move === undefined) return;
        void playTile({
            gameId,
            userId: myUserId,
            tile: [move.tile[0], move.tile[1]],
            side: move.side,
        });
        setSelectedTile(null);
    };

    const anyPlay = moves.some((m) => m.kind === "play");
    const canLeft = selectedTile !== null ? sidesForSelected.includes("left") : anyPlay;
    const canRight = selectedTile !== null ? sidesForSelected.includes("right") : anyPlay;

    // Sort opponents in CCW turn order starting from my left (next-to-act).
    const myPos = view.mySeatPosition ?? 0;
    const opponentsOrdered = [...state.seats]
        .filter((s) => s.position !== myPos)
        .sort((a, b) => {
            const da = (a.position - myPos + 4) % 4;
            const db = (b.position - myPos + 4) % 4;
            return da - db;
        });

    const renderOpponent = (seat: (typeof state.seats)[number]) => {
        const handCount = opponentCounts[seat.position] ?? 0;
        const isCurrent = view.turnIndex === seat.position;
        const seatAvatar = (
            view.seats.find((s) => s.position === seat.position) as
                | { avatar?: string | null }
                | undefined
        )?.avatar;
        return (
            <OpponentRow
                key={seat.position}
                seat={seat}
                handCount={handCount}
                isCurrentTurn={isCurrent}
                isAiThinking={false}
                placement="row"
                avatarId={seatAvatar ?? null}
                showTiles
            />
        );
    };

    const currentName =
        state.seats.find((s) => s.position === view.turnIndex)?.displayName ?? "?";

    return (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="flex flex-1 flex-col gap-3">
                <ScoreBar state={state} />

                <div className="flex items-start justify-around gap-2">
                    {opponentsOrdered.map((s) => renderOpponent(s))}
                </div>

                <div className="my-1 flex-1">
                    <Chain
                        chain={state.chain}
                        canDropLeft={isMyTurn && canLeft}
                        canDropRight={isMyTurn && canRight}
                        onTapLeft={() => playOnSide("left")}
                        onTapRight={() => playOnSide("right")}
                    />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-pr-coal-soft/40 px-3 py-2 text-sm">
                    <span className="text-pr-ivory-dim">
                        {isMyTurn
                            ? mustDraw
                                ? t("mustDraw")
                                : mustPass
                                  ? t("noLegalPlay")
                                  : t("yourTurn")
                            : t("isPlaying", { name: currentName })}
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

                <Hand
                    hand={myHand}
                    playable={playable}
                    selectedTile={selectedTile}
                    isHumanTurn={isMyTurn}
                    onSelect={onTileSelect}
                />
            </div>
        </DndContext>
    );
}

// Re-export the local Board so callers can pick which to render. Unused for now but kept here
// for explicitness about the two flows.
export { LocalBoardPanel };
