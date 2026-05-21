import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import { useIdentityStore } from "../../state/identityStore.js";
import { useOnlineStore } from "../../state/onlineGameStore.js";
import { useGameStore } from "../../state/gameStore.js";

// Pre-game lobby: shows the seats around the table, lets the host add AI fill-ins and start
// the match once all seats are filled. Non-host players see the same state, can't act.
export function SeatPicker() {
    const lang = useGameStore((s) => s.lang);
    const gameId = useOnlineStore((s) => s.gameId);
    const roomCode = useOnlineStore((s) => s.roomCode);
    const setScreen = useOnlineStore((s) => s.setScreen);
    const clearGame = useOnlineStore((s) => s.clearGame);
    const deviceId = useIdentityStore((s) => s.deviceId);

    const me = useQuery(api.users.getUserByDeviceId, { deviceId });
    const lobby = useQuery(
        api.views.lobbyView,
        gameId !== null ? { gameId } : "skip",
    );
    const addAiSeat = useMutation(api.lobbies.addAiSeat);
    const leaveLobby = useMutation(api.lobbies.leaveLobby);
    const startMatch = useMutation(api.games.startMatch);
    const sendInvite = useMutation(api.invites.sendInvite);
    const friends = useQuery(api.friends.getFriends, me ? { userId: me._id } : "skip") ?? [];
    const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

    // When the lobby phase transitions to in_round, jump to the playing screen.
    useEffect(() => {
        if (lobby?.phase === "in_round") setScreen("playing");
    }, [lobby?.phase, setScreen]);

    if (gameId === null || lobby === null || lobby === undefined || !me) {
        return <p className="p-4 text-center text-pr-ivory-dim">…</p>;
    }

    const isHost = lobby.hostUserId === me._id;
    const maxSeats = lobby.mode === "2p" ? 2 : 4;
    const filled = lobby.seats.length;
    const positions = Array.from({ length: maxSeats }, (_, i) => i);

    const onAddAi = (position: 0 | 1 | 2 | 3) => {
        if (!isHost || gameId === null) return;
        void addAiSeat({ gameId, callerUserId: me._id, position });
    };

    const onStart = () => {
        if (!isHost || gameId === null) return;
        void startMatch({ gameId, callerUserId: me._id });
    };

    const onLeave = () => {
        if (gameId === null) return;
        void leaveLobby({ gameId, userId: me._id });
        clearGame();
    };

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-pr-ivory-dim">
                    {lang === "es" ? "Código de sala" : "Room code"}
                </p>
                <p className="font-mono text-4xl tracking-widest text-pr-coqui">{roomCode}</p>
                <button
                    type="button"
                    onClick={() => {
                        if (roomCode === null) return;
                        const url = `${window.location.origin}${window.location.pathname}?join=${roomCode}`;
                        if (navigator.share) {
                            void navigator.share({ title: "Dominos Con Tranpas", url });
                        } else {
                            void navigator.clipboard?.writeText(url);
                        }
                    }}
                    className="mt-1 text-[11px] text-pr-ivory-dim underline"
                >
                    {lang === "es" ? "Compartir enlace" : "Share link"}
                </button>
            </div>

            <div className="grid w-full max-w-md grid-cols-2 gap-2">
                {positions.map((pos) => {
                    const seat = lobby.seats.find((s: { position: number }) => s.position === pos);
                    if (seat) {
                        return (
                            <div
                                key={pos}
                                className={`rounded-xl border-l-4 ${seat.team === "A" ? "border-pr-blue" : "border-pr-red"} bg-pr-coal-soft/40 px-3 py-2`}
                            >
                                <div className="text-[10px] uppercase tracking-wider text-pr-ivory-dim">
                                    {lang === "es" ? "Asiento" : "Seat"} {pos} · {seat.team}
                                </div>
                                <div className="font-display text-pr-ivory">
                                    {seat.displayName}
                                    {seat.isAI && (
                                        <span className="ml-2 text-[10px] text-pr-coqui">AI</span>
                                    )}
                                </div>
                            </div>
                        );
                    }
                    return (
                        <button
                            key={pos}
                            type="button"
                            onClick={() => onAddAi(pos as 0 | 1 | 2 | 3)}
                            disabled={!isHost}
                            className="rounded-xl border-2 border-dashed border-pr-coal-soft px-3 py-2 text-[11px] text-pr-ivory-dim hover:text-pr-ivory disabled:opacity-40"
                        >
                            {isHost
                                ? lang === "es"
                                    ? `Añadir IA al asiento ${pos}`
                                    : `Add AI to seat ${pos}`
                                : lang === "es"
                                  ? "Asiento vacío"
                                  : "Empty seat"}
                        </button>
                    );
                })}
            </div>

            {friends.length > 0 && (
                <div className="w-full max-w-md rounded-xl bg-pr-coal-soft/60 p-3">
                    <p className="mb-2 text-xs text-pr-ivory-dim">
                        {lang === "es" ? "Invitar amigos" : "Invite friends"}
                    </p>
                    <ul className="flex flex-col gap-2">
                        {friends.map((f) => {
                            const busy = f.activeGameId !== undefined && f.activeGameId !== null;
                            const invited = invitedIds.has(f.userId);
                            const disabled = busy || invited || !me || !gameId;
                            return (
                                <li key={f.friendshipId} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{f.avatar ?? "🙂"}</span>
                                        <span className="text-sm text-pr-ivory">{f.displayName}</span>
                                        {busy && (
                                            <span className="text-xs text-pr-ivory-dim">
                                                {lang === "es" ? "(en partida)" : "(in game)"}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => {
                                            if (!me || !gameId) return;
                                            void sendInvite({
                                                gameId,
                                                fromUserId: me._id,
                                                toUserId: f.userId as never,
                                            });
                                            setInvitedIds((prev) => {
                                                const next = new Set(prev);
                                                next.add(f.userId);
                                                return next;
                                            });
                                        }}
                                        className="rounded-lg bg-pr-coqui px-3 py-1 text-xs font-bold text-pr-coal disabled:bg-pr-coal disabled:text-pr-ivory-dim"
                                    >
                                        {invited
                                            ? (lang === "es" ? "Invitado" : "Invited")
                                            : (lang === "es" ? "Invitar" : "Invite")}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onLeave}
                    className="rounded-xl border border-pr-coal-soft px-6 py-2 text-pr-ivory-dim hover:text-pr-ivory"
                >
                    {lang === "es" ? "Salir" : "Leave"}
                </button>
                {isHost && (
                    <button
                        type="button"
                        onClick={onStart}
                        disabled={filled !== maxSeats}
                        className="rounded-xl bg-pr-blue px-6 py-2 font-display text-pr-white shadow disabled:opacity-40"
                    >
                        {lang === "es" ? "Empezar" : "Start match"}
                    </button>
                )}
            </div>
        </div>
    );
}
