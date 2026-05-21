import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import { useIdentityStore } from "../../state/identityStore.js";
import { useOnlineStore } from "../../state/onlineGameStore.js";
import { useGameStore } from "../../state/gameStore.js";

type Mode = "4p-partners" | "2p";

export function CreateGame() {
    const lang = useGameStore((s) => s.lang);
    const deviceId = useIdentityStore((s) => s.deviceId);
    const setGame = useOnlineStore((s) => s.setGame);
    const setScreen = useOnlineStore((s) => s.setScreen);

    const me = useQuery(api.users.getUserByDeviceId, { deviceId });
    const createGame = useMutation(api.lobbies.createGame);

    const [mode, setMode] = useState<Mode>("4p-partners");
    const [enableTranpas, setEnableTranpas] = useState(true);
    const [creating, setCreating] = useState(false);

    const onCreate = async () => {
        if (!me) return;
        setCreating(true);
        try {
            const { gameId, roomCode } = await createGame({
                hostUserId: me._id,
                mode,
                enableTranpas,
            });
            setGame(gameId, roomCode);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <h2 className="font-display text-3xl text-pr-ivory">
                {lang === "es" ? "Nueva partida" : "New game"}
            </h2>
            <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 rounded-lg border border-pr-coal-soft bg-pr-coal-soft/40 px-4 py-2 text-left">
                    <input
                        type="radio"
                        name="mode"
                        value="4p-partners"
                        checked={mode === "4p-partners"}
                        onChange={() => setMode("4p-partners")}
                    />
                    <div>
                        <div className="font-display text-pr-ivory">
                            {lang === "es" ? "4 jugadores (compañeros)" : "4 players (partners)"}
                        </div>
                        <div className="text-[11px] text-pr-ivory-dim">
                            {lang === "es"
                                ? "Canónico. Equipos A vs B."
                                : "Canonical. Teams A vs B."}
                        </div>
                    </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-pr-coal-soft bg-pr-coal-soft/40 px-4 py-2 text-left">
                    <input
                        type="radio"
                        name="mode"
                        value="2p"
                        checked={mode === "2p"}
                        onChange={() => setMode("2p")}
                    />
                    <div>
                        <div className="font-display text-pr-ivory">
                            {lang === "es" ? "2 jugadores" : "2 players"}
                        </div>
                        <div className="text-[11px] text-pr-ivory-dim">
                            {lang === "es"
                                ? "7 fichas cada uno; 14 muertas."
                                : "7 tiles each; 14 dead."}
                        </div>
                    </div>
                </label>
            </div>

            <div className="mt-2 flex flex-col gap-2">
                <p className="text-[10px] uppercase tracking-wider text-pr-ivory-dim">
                    {lang === "es" ? "Reglas" : "Rules"}
                </p>
                <label className="flex items-center gap-3 rounded-lg border border-pr-coal-soft bg-pr-coal-soft/40 px-4 py-2 text-left">
                    <input
                        type="radio"
                        name="rules"
                        checked={enableTranpas}
                        onChange={() => setEnableTranpas(true)}
                    />
                    <div>
                        <div className="font-display text-pr-ivory">Con Tranpas</div>
                        <div className="text-[11px] text-pr-ivory-dim">
                            {lang === "es"
                                ? "El próximo jugador roba una ficha a ciegas."
                                : "Next player blindly steals a tile."}
                        </div>
                    </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-pr-coal-soft bg-pr-coal-soft/40 px-4 py-2 text-left">
                    <input
                        type="radio"
                        name="rules"
                        checked={!enableTranpas}
                        onChange={() => setEnableTranpas(false)}
                    />
                    <div>
                        <div className="font-display text-pr-ivory">
                            {lang === "es" ? "Clásico" : "Classic"}
                        </div>
                        <div className="text-[11px] text-pr-ivory-dim">
                            {lang === "es"
                                ? "Dominó tradicional, sin robos. Confianza pura."
                                : "Traditional domino, no stealing. Pure trust."}
                        </div>
                    </div>
                </label>
            </div>
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
                    onClick={() => void onCreate()}
                    disabled={creating || !me}
                    className="rounded-xl bg-pr-blue px-6 py-2 font-display text-pr-white shadow disabled:opacity-40"
                >
                    {creating ? "..." : lang === "es" ? "Crear" : "Create"}
                </button>
            </div>
        </div>
    );
}
