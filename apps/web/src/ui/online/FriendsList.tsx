import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import { useGameStore } from "../../state/gameStore.js";
import { useOnlineStore } from "../../state/onlineGameStore.js";
import { useIdentityStore } from "../../state/identityStore.js";
import { PlayerAvatar } from "../PlayerAvatar.js";

type Tab = "friends" | "requests";

export function FriendsList() {
    const lang = useGameStore((s) => s.lang);
    const setScreen = useOnlineStore((s) => s.setScreen);
    const deviceId = useIdentityStore((s) => s.deviceId);

    const [tab, setTab] = useState<Tab>("friends");
    const [codeInput, setCodeInput] = useState("");
    const [addError, setAddError] = useState<string | null>(null);
    const [addSuccess, setAddSuccess] = useState<string | null>(null);

    const me = useQuery(api.users.getUserByDeviceId, { deviceId });
    const friends = useQuery(api.friends.getFriends, me ? { userId: me._id } : "skip");
    const pending = useQuery(api.friends.getPendingRequests, me ? { userId: me._id } : "skip");

    const sendRequest = useMutation(api.friends.sendFriendRequest);
    const acceptRequest = useMutation(api.friends.acceptFriendRequest);
    const declineRequest = useMutation(api.friends.declineFriendRequest);
    const removeF = useMutation(api.friends.removeFriend);

    if (me === undefined || me === null) {
        return <p className="p-4 text-center text-pr-ivory-dim">…</p>;
    }

    const es = lang === "es";

    const onAdd = async () => {
        const code = codeInput.trim().toUpperCase();
        if (code.length !== 8) {
            setAddError(es ? "El código tiene 8 caracteres" : "Code must be 8 characters");
            return;
        }
        setAddError(null);
        setAddSuccess(null);
        try {
            const name = await sendRequest({ callerId: me._id, friendCode: code });
            setAddSuccess(
                es ? `¡Solicitud enviada a ${name}!` : `Request sent to ${name}!`,
            );
            setCodeInput("");
        } catch (e) {
            setAddError(e instanceof Error ? e.message : String(e));
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-3 p-3">
            {/* Header */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setScreen("lobby-hub")}
                    className="rounded-lg px-2 py-1 text-pr-ivory-dim hover:text-pr-ivory"
                >
                    ←
                </button>
                <h2 className="font-display text-xl text-pr-ivory">
                    {es ? "Amigos" : "Friends"}
                </h2>
            </div>

            {/* Add friend */}
            <div className="rounded-xl bg-pr-coal-soft/60 p-3">
                <p className="mb-2 text-xs text-pr-ivory-dim">
                    {es ? "Agregar por código de amigo" : "Add by friend code"}
                </p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                        placeholder={es ? "ABCD1234" : "ABCD1234"}
                        maxLength={8}
                        className="flex-1 rounded-lg bg-pr-coal px-3 py-2 font-mono text-sm uppercase tracking-widest text-pr-ivory placeholder-pr-ivory-dim/50 outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => void onAdd()}
                        className="rounded-lg bg-pr-coqui px-4 py-2 text-sm font-bold text-pr-coal"
                    >
                        {es ? "Agregar" : "Add"}
                    </button>
                </div>
                {addError && <p className="mt-1.5 text-xs text-pr-red">{addError}</p>}
                {addSuccess && (
                    <p className="mt-1.5 text-xs text-pr-coqui">{addSuccess}</p>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-pr-coal-soft/40 p-1">
                {(["friends", "requests"] as Tab[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                            tab === t
                                ? "bg-pr-coal-soft text-pr-ivory"
                                : "text-pr-ivory-dim hover:text-pr-ivory"
                        }`}
                    >
                        {t === "friends"
                            ? es
                                ? "Amigos"
                                : "Friends"
                            : es
                              ? `Solicitudes${(pending?.length ?? 0) > 0 ? ` (${pending!.length})` : ""}`
                              : `Requests${(pending?.length ?? 0) > 0 ? ` (${pending!.length})` : ""}`}
                    </button>
                ))}
            </div>

            {/* Friends list */}
            {tab === "friends" && (
                <div className="flex flex-col gap-2 overflow-y-auto">
                    {(friends ?? []).length === 0 ? (
                        <p className="py-6 text-center text-sm text-pr-ivory-dim">
                            {es
                                ? "Aún no tienes amigos. ¡Agrega uno arriba!"
                                : "No friends yet. Add one above!"}
                        </p>
                    ) : (
                        (friends ?? []).map((f) => (
                            <div
                                key={f.friendshipId}
                                className="flex items-center gap-3 rounded-xl bg-pr-coal-soft/60 px-3 py-2"
                            >
                                <PlayerAvatar avatarId={f.avatar} size="sm" />
                                <div className="flex flex-1 flex-col">
                                    <span className="text-sm text-pr-ivory">
                                        {f.displayName}
                                    </span>
                                    <span className="text-[11px] text-pr-ivory-dim">
                                        {f.activeGameId
                                            ? es
                                                ? "En partida"
                                                : "In a game"
                                            : es
                                              ? "Libre"
                                              : "Available"}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        void removeF({
                                            callerId: me._id,
                                            friendshipId: f.friendshipId,
                                        })
                                    }
                                    className="rounded-lg border border-pr-coal-soft/70 px-2 py-1 text-[11px] text-pr-ivory-dim hover:text-pr-red"
                                >
                                    {es ? "Eliminar" : "Remove"}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Pending requests */}
            {tab === "requests" && (
                <div className="flex flex-col gap-2 overflow-y-auto">
                    {(pending ?? []).length === 0 ? (
                        <p className="py-6 text-center text-sm text-pr-ivory-dim">
                            {es
                                ? "Sin solicitudes pendientes"
                                : "No pending requests"}
                        </p>
                    ) : (
                        (pending ?? []).map((r) => (
                            <div
                                key={r.friendshipId}
                                className="flex items-center gap-3 rounded-xl bg-pr-coal-soft/60 px-3 py-2"
                            >
                                <PlayerAvatar avatarId={r.avatar} size="sm" />
                                <span className="flex-1 text-sm text-pr-ivory">
                                    {r.displayName}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            void acceptRequest({
                                                callerId: me._id,
                                                friendshipId: r.friendshipId,
                                            })
                                        }
                                        className="rounded-lg bg-pr-coqui px-3 py-1 text-xs font-bold text-pr-coal"
                                    >
                                        {es ? "Aceptar" : "Accept"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            void declineRequest({
                                                callerId: me._id,
                                                friendshipId: r.friendshipId,
                                            })
                                        }
                                        className="rounded-lg border border-pr-coal-soft/70 px-2 py-1 text-xs text-pr-ivory-dim"
                                    >
                                        {es ? "Rechazar" : "Decline"}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
