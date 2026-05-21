import { useState } from "react";
import { useGameStore } from "../state/gameStore.js";
import type { Lang } from "../i18n/strings.js";

// Embeddable language picker body — ES/EN choice without the floating-button shell. Mounted
// inside SettingsMenu now that language lives there.
export function LanguagePickerBody() {
    const lang = useGameStore((s) => s.lang);
    const setLang = useGameStore((s) => s.setLang);
    return (
        <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-pr-ivory-dim">
                {lang === "es" ? "Idioma" : "Language"}
            </span>
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => setLang("es")}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${lang === "es" ? "bg-pr-coqui/20 text-pr-coqui ring-1 ring-pr-coqui" : "bg-pr-coal-soft/40 text-pr-ivory hover:bg-pr-coal-soft/70"}`}
                >
                    <span aria-hidden>🇵🇷</span>
                    <span>Español</span>
                </button>
                <button
                    type="button"
                    onClick={() => setLang("en")}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${lang === "en" ? "bg-pr-coqui/20 text-pr-coqui ring-1 ring-pr-coqui" : "bg-pr-coal-soft/40 text-pr-ivory hover:bg-pr-coal-soft/70"}`}
                >
                    <span aria-hidden>🇺🇸</span>
                    <span>English</span>
                </button>
            </div>
        </div>
    );
}

// Top-left floating language toggle. No longer mounted by default — SettingsMenu embeds
// LanguagePickerBody directly. Kept exported for backwards compat.
export function LanguageMenu() {
    const [open, setOpen] = useState(false);
    const lang = useGameStore((s) => s.lang);
    const setLang = useGameStore((s) => s.setLang);

    const choose = (next: Lang) => {
        setLang(next);
        setOpen(false);
    };

    return (
        <div className="fixed left-3 top-3 z-30 select-none">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Language"
                className="flex items-center gap-1 rounded-full border border-pr-coal-soft/60 bg-pr-coal-soft/70 px-3 py-1 text-sm text-pr-ivory shadow hover:bg-pr-coal-soft"
            >
                <span aria-hidden>🌐</span>
                <span className="font-display text-xs uppercase tracking-wider">{lang}</span>
            </button>
            {open && (
                <div className="mt-2 w-44 space-y-1 rounded-2xl border border-pr-coal-soft/60 bg-pr-table-dark/95 p-2 shadow-xl">
                    <button
                        type="button"
                        onClick={() => choose("es")}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${lang === "es" ? "bg-pr-coqui/20 text-pr-coqui" : "text-pr-ivory hover:bg-pr-coal-soft/70"}`}
                    >
                        <span aria-hidden>🇵🇷</span>
                        <span>Español</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => choose("en")}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${lang === "en" ? "bg-pr-coqui/20 text-pr-coqui" : "text-pr-ivory hover:bg-pr-coal-soft/70"}`}
                    >
                        <span aria-hidden>🇺🇸</span>
                        <span>English</span>
                    </button>
                </div>
            )}
        </div>
    );
}
