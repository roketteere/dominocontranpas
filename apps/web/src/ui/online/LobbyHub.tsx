import { useMutation, useQuery } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import { useGameStore } from "../../state/gameStore.js";
import { useOnlineStore } from "../../state/onlineGameStore.js";
import { useIdentityStore } from "../../state/identityStore.js";
import { PlayerAvatar } from "../PlayerAvatar.js";

function ModeLabel({ mode, lang }: { mode: string; lang: string }) {
    if (mode === "4p-partners") return <>{lang === "es" ? "4 jugadores" : "4 players"}</>;
    if (mode === "2p") return <>{lang === "es" ? "2 jugadores" : "2 players"}</>;
    return <>{lang === "es" ? "Solo vs IA" : "Solo vs AI"}</>;
}

export function LobbyHub() {
    const lang = useGameStore((s) => s.lang);
    const setScreen = useOnlineStore((s) => s.setScreen);
    const resumeGame = useOnlineStore((s) => s.resumeGame);
    const returnToMenu = useGameStore((s) => s.returnToMenu);
    const deviceId = useIdentityStore((s) => s.deviceId);
    const displayName = useIdentityStore((s) => s.displayName);

    const me = useQuery(api.users.getUserByDeviceId, { deviceId });
    const myGames = useQuery(api.views.listMyGames, me ? { userId: me._id } : "skip");
    const myInvites = useQuery(api.invites.getMyInvites, me ? { userId: me._id } : "skip");
    const pendingRequests = useQuery(
        api.friends.getPendingRequests,
        me ? { userId: me._id } : "skip",
    );
    const dismissInvite = useMutation(api.invites.dismissInvite);

    if (me === undefined || me === null) {
        return <p className="p-4 text-center text-pr-ivory-dim">…</p>;
    }

    // Find the one active game (lobby / in_round / round_end).
    const activeGame = myGames?.find(
        (g) => g.phase !== "match_end" && g.phase !== "abandoned",
    );

    const pendingRequestCount = pendingRequests?.length ?? 0;
    const invites = myInvites ?? [];

    const onResume = () => {
        if (!activeGame) return;
        resumeGame(activeGame.gameId, activeGame.roomCode, activeGame.phase);
    };

    const onAcceptInvite = (roomCode: string) => {
        setScreen("join-game");
        // JoinGame reads the query param or lets user type the code — pre-fill via store isn't
        // wired yet, so just navigate to join-game and the user can enter the code shown.
        // (Future: pass pre-fill code through store.)
        window.history.pushState({}, "", `?join=${roomCode}`);
    };

    const es = lang === "es";

    return (
        <div className="flex flex-1 flex-col gap-4 p-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl text-pr-ivory">
                    {es ? "Jugar en línea" : "Play Online"}
                </h2>
                <div className="flex items-center gap-1.5">
                    {me.avatar && <PlayerAvatar avatarId={me.avatar} size="sm" />}
                    <span className="text-sm text-pr-ivory-dim">{displayName}</span>
                </div>
            </div>

            {/* Friend code chip */}
            {me.friendCode && (
                <div className="flex items-center gap-2 rounded-lg bg-pr-coal-soft/60 px-3 py-1.5">
                    <span className="text-[11px] text-pr-ivory-dim">
                        {es ? "Tu código:" : "Your code:"}
                    </span>
                    <span className="font-mono text-sm font-bold tracking-widest text-pr-coqui">
                        {me.friendCode}
                    </span>
                </div>
            )}

            {/* Resume active game */}
            {activeGame && (
                <button
                    type="button"
                    onClick={onResume}
                    className="flex w-full items-center justify-between rounded-xl bg-pr-blue px-4 py-3 shadow hover:brightness-110 active:scale-95"
                >
                    <span className="font-display text-lg text-pr-white">
                        {es ? "Reanudar partida" : "Resume game"}
                    </span>
                    <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs text-pr-white">
                        {activeGame.roomCode}
                    </span>
                </button>
            )}

            {/* Game invites */}
            {invites.length > 0 && (
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-pr-ivory-dim">
                        {es ? "Invitaciones" : "Invitations"}
                    </p>
                    {invites.map((inv) => (
                        <div
                            key={inv.inviteId}
                            className="flex items-center gap-3 rounded-xl bg-pr-coal-soft/60 px-3 py-2"
                        >
                            {inv.fromAvatar && (
                                <PlayerAvatar avatarId={inv.fromAvatar} size="sm" />
                            )}
                            <div className="flex flex-1 flex-col">
                                <span className="text-sm text-pr-ivory">
                                    {inv.fromDisplayName}
                                </span>
                                <span className="text-[11px] text-pr-ivory-dim">
                                    <ModeLabel mode={inv.mode} lang={lang} />
                                    {" · "}
                                    {inv.roomCode}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onAcceptInvite(inv.roomCode)}
                                    className="rounded-lg bg-pr-coqui px-3 py-1 text-xs font-bold text-pr-coal"
                                >
                                    {es ? "Unirse" : "Join"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        void dismissInvite({
                                            inviteId: inv.inviteId,
                                            userId: me._id,
                                        })
                                    }
                                    className="rounded-lg border border-pr-coal-soft/70 px-2 py-1 text-xs text-pr-ivory-dim"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Main action buttons */}
            <div className="flex flex-col gap-3">
                {!activeGame && (
                    <>
                        <button
                            type="button"
                            onClick={() => setScreen("create-game")}
                            className="rounded-xl bg-pr-blue px-8 py-3 font-display text-lg text-pr-white shadow hover:scale-105 active:scale-95"
                        >
                            {es ? "Crear partida" : "Create a game"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setScreen("join-game")}
                            className="rounded-xl bg-pr-red px-8 py-3 font-display text-lg text-pr-white shadow hover:scale-105 active:scale-95"
                        >
                            {es ? "Unirse con código" : "Join with code"}
                        </button>
                    </>
                )}

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setScreen("friends")}
                        className="relative flex flex-1 items-center justify-center gap-2 rounded-xl bg-pr-coal-soft/70 px-4 py-2.5 text-sm text-pr-ivory hover:bg-pr-coal-soft active:scale-95"
                    >
                        {es ? "Amigos" : "Friends"}
                        {pendingRequestCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-pr-red text-[10px] font-bold text-white">
                                {pendingRequestCount}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setScreen("leaderboard")}
                        className="flex flex-1 items-center justify-center rounded-xl bg-pr-coal-soft/70 px-4 py-2.5 text-sm text-pr-ivory hover:bg-pr-coal-soft active:scale-95"
                    >
                        {es ? "Tabla" : "Leaderboard"}
                    </button>
                </div>
            </div>

            <button
                type="button"
                onClick={returnToMenu}
                className="mt-auto rounded-lg border border-pr-coal-soft px-6 py-1 text-xs text-pr-ivory-dim hover:text-pr-ivory"
            >
                {es ? "Salir al menú" : "Back to menu"}
            </button>
        </div>
    );
}
