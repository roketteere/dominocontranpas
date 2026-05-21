import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import { useIdentityStore } from "../../state/identityStore.js";
import { useOnlineStore } from "../../state/onlineGameStore.js";
import { useGameStore } from "../../state/gameStore.js";

export function JoinGame() {
    const lang = useGameStore((s) => s.lang);
    const deviceId = useIdentityStore((s) => s.deviceId);
    const setGame = useOnlineStore((s) => s.setGame);
    const setScreen = useOnlineStore((s) => s.setScreen);

    const me = useQuery(api.users.getUserByDeviceId, { deviceId });
    const joinByCode = useMutation(api.lobbies.joinByCode);

    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);

    const onJoin = async () => {
        if (!me) return;
        const cleaned = code.toUpperCase().trim();
        if (cleaned.length !== 6) {
            setError(lang === "es" ? "El código tiene 6 letras/números" : "Code is 6 characters");
            return;
        }
        setJoining(true);
        setError(null);
        try {
            const result = await joinByCode({ roomCode: cleaned, userId: me._id });
            // Convex doesn't tell us the room code back; use the cleaned input.
            setGame(result.gameId, cleaned);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not join");
        } finally {
            setJoining(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <h2 className="font-display text-3xl text-pr-ivory">
                {lang === "es" ? "Unirse" : "Join"}
            </h2>
            <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={(e) => {
                    if (e.key === "Enter") void onJoin();
                }}
                maxLength={6}
                placeholder="ABCD23"
                autoFocus
                className="w-48 rounded-xl border border-pr-coal-soft bg-pr-coal-soft/40 px-4 py-3 text-center font-mono text-2xl tracking-widest text-pr-ivory placeholder:text-pr-ivory-dim/50 focus:border-pr-coqui focus:outline-none"
            />
            {error !== null && <p className="text-sm text-pr-red">{error}</p>}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setScreen("lobby-hub")}
                    className="rounded-xl border border-pr-coal-soft px-6 py-2 text-pr-ivory-dim hover:text-pr-ivory"
                >
                    ←
                </button>
                <button
                    type="button"
                    onClick={() => void onJoin()}
                    disabled={joining || code.length !== 6}
                    className="rounded-xl bg-pr-red px-6 py-2 font-display text-pr-white shadow disabled:opacity-40"
                >
                    {joining ? "..." : lang === "es" ? "Unirse" : "Join"}
                </button>
            </div>
        </div>
    );
}
