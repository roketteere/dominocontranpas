import { useGameStore } from "../../state/gameStore.js";
import { useOnlineStore } from "../../state/onlineGameStore.js";
import { useIdentityStore } from "../../state/identityStore.js";
import { useT } from "../../i18n/index.js";

// Online-mode hub: pick Create or Join. Or back to the main menu.
export function LobbyHub() {
    const t = useT();
    const lang = useGameStore((s) => s.lang);
    const setScreen = useOnlineStore((s) => s.setScreen);
    const returnToMenu = useGameStore((s) => s.returnToMenu);
    const displayName = useIdentityStore((s) => s.displayName);

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <h2 className="font-display text-3xl text-pr-ivory">
                {lang === "es" ? "Jugar en línea" : "Play online"}
            </h2>
            <p className="text-sm text-pr-ivory-dim">
                {lang === "es" ? `Hola, ${displayName}` : `Hi, ${displayName}`}
            </p>
            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={() => setScreen("create-game")}
                    className="rounded-xl bg-pr-blue px-8 py-3 font-display text-lg text-pr-white shadow hover:scale-105 active:scale-95"
                >
                    {lang === "es" ? "Crear partida" : "Create a game"}
                </button>
                <button
                    type="button"
                    onClick={() => setScreen("join-game")}
                    className="rounded-xl bg-pr-red px-8 py-3 font-display text-lg text-pr-white shadow hover:scale-105 active:scale-95"
                >
                    {lang === "es" ? "Unirse con código" : "Join with code"}
                </button>
            </div>
            <button
                type="button"
                onClick={returnToMenu}
                className="rounded-lg border border-pr-coal-soft px-6 py-1 text-xs text-pr-ivory-dim hover:text-pr-ivory"
            >
                {t("quitToMenu")}
            </button>
        </div>
    );
}
