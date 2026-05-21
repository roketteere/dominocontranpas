import { useState } from "react";
import { useGameStore } from "../state/gameStore.js";

const IN_MATCH_SCREENS = new Set(["playing", "round_end"]);

export function SettingsMenu() {
    const [open, setOpen] = useState(false);
    const lang = useGameStore((s) => s.lang);
    const screen = useGameStore((s) => s.screen);
    const returnToMenu = useGameStore((s) => s.returnToMenu);
    const inMatch = IN_MATCH_SCREENS.has(screen);

    const quit = () => {
        returnToMenu();
        setOpen(false);
    };

    return (
        <div className="relative select-none">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={lang === "es" ? "Ajustes" : "Settings"}
                className="flex items-center justify-center rounded-full border border-pr-coal-soft/60 bg-pr-coal-soft/70 px-3 py-1 text-lg leading-none text-pr-ivory shadow hover:bg-pr-coal-soft"
            >
                ⚙️
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-56 space-y-3 rounded-2xl border border-pr-coal-soft/60 bg-pr-table-dark/95 p-4 text-sm text-pr-ivory shadow-xl">
                    <p className="font-display text-pr-coqui">
                        {lang === "es" ? "Ajustes" : "Settings"}
                    </p>
                    {inMatch && (
                        <button
                            type="button"
                            onClick={quit}
                            className="w-full rounded-xl border border-pr-red/60 bg-pr-red/20 py-2 text-sm text-pr-ivory transition-colors hover:bg-pr-red/40"
                        >
                            {lang === "es" ? "Abandonar partida" : "Quit match"}
                        </button>
                    )}
                    <p className="text-[11px] text-pr-ivory-dim">
                        {lang === "es"
                            ? "Más opciones próximamente."
                            : "More options coming soon."}
                    </p>
                    <div className="border-t border-pr-coal-soft/40 pt-2 text-[10px] text-pr-ivory-dim">
                        <p>Dominos Con Tranpas</p>
                        <p>By: Joel Pérez Santiago · TeKi</p>
                    </div>
                </div>
            )}
        </div>
    );
}
