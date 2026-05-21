import { useState } from "react";
import { useGameStore } from "../state/gameStore.js";

export function SettingsMenu() {
    const [open, setOpen] = useState(false);
    const lang = useGameStore((s) => s.lang);

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
