import { useState } from "react";
import { useAudioStore } from "../audio/audioStore.js";
import { useGameStore } from "../state/gameStore.js";

// Embeddable audio controls body — the volume slider + mute/music/SFX toggles without the
// floating-button shell. Mounted inside SettingsMenu now that audio lives there.
export function AudioControlsBody() {
    const lang = useGameStore((s) => s.lang);
    const masterVolume = useAudioStore((s) => s.masterVolume);
    const muted = useAudioStore((s) => s.muted);
    const musicEnabled = useAudioStore((s) => s.musicEnabled);
    const sfxEnabled = useAudioStore((s) => s.sfxEnabled);
    const setMasterVolume = useAudioStore((s) => s.setMasterVolume);
    const toggleMuted = useAudioStore((s) => s.toggleMuted);
    const setMusicEnabled = useAudioStore((s) => s.setMusicEnabled);
    const setSfxEnabled = useAudioStore((s) => s.setSfxEnabled);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-pr-ivory-dim">
                    {lang === "es" ? "Sonido" : "Sound"}
                </span>
                <button
                    type="button"
                    onClick={toggleMuted}
                    className={`rounded-md px-2 py-0.5 text-xs ${muted ? "bg-pr-red text-pr-white" : "bg-pr-coal-soft text-pr-ivory-dim"}`}
                >
                    {muted
                        ? lang === "es" ? "Silenciado" : "Muted"
                        : lang === "es" ? "Activo" : "Live"}
                </button>
            </div>
            <label className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider text-pr-ivory-dim">
                    {lang === "es" ? "Volumen" : "Volume"} · {Math.round(masterVolume * 100)}%
                </span>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(Number(e.target.value))}
                    className="accent-pr-coqui"
                />
            </label>
            <label className="flex items-center justify-between gap-2">
                <span className="text-xs">{lang === "es" ? "Música" : "Music"}</span>
                <input
                    type="checkbox"
                    checked={musicEnabled}
                    onChange={(e) => setMusicEnabled(e.target.checked)}
                    className="h-4 w-4 accent-pr-coqui"
                />
            </label>
            <label className="flex items-center justify-between gap-2">
                <span className="text-xs">{lang === "es" ? "Efectos" : "Sound effects"}</span>
                <input
                    type="checkbox"
                    checked={sfxEnabled}
                    onChange={(e) => setSfxEnabled(e.target.checked)}
                    className="h-4 w-4 accent-pr-coqui"
                />
            </label>
        </div>
    );
}

// Floating audio controls in the top-right corner. No longer mounted by default — SettingsMenu
// embeds AudioControlsBody directly. Kept exported in case anything else references it.
export function AudioControls() {
    const [open, setOpen] = useState(false);
    const lang = useGameStore((s) => s.lang);
    const masterVolume = useAudioStore((s) => s.masterVolume);
    const muted = useAudioStore((s) => s.muted);
    const musicEnabled = useAudioStore((s) => s.musicEnabled);
    const sfxEnabled = useAudioStore((s) => s.sfxEnabled);
    const setMasterVolume = useAudioStore((s) => s.setMasterVolume);
    const toggleMuted = useAudioStore((s) => s.toggleMuted);
    const setMusicEnabled = useAudioStore((s) => s.setMusicEnabled);
    const setSfxEnabled = useAudioStore((s) => s.setSfxEnabled);

    const icon = muted || masterVolume === 0 ? "🔇" : masterVolume > 0.5 ? "🔊" : "🔉";

    return (
        <div className="relative select-none">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={lang === "es" ? "Sonido" : "Sound"}
                className="flex items-center justify-center rounded-full border border-pr-coal-soft/60 bg-pr-coal-soft/70 px-3 py-1 text-lg leading-none text-pr-ivory shadow hover:bg-pr-coal-soft"
            >
                {icon}
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-64 space-y-3 rounded-2xl border border-pr-coal-soft/60 bg-pr-table-dark/95 p-4 text-sm text-pr-ivory shadow-xl">
                    <div className="flex items-center justify-between">
                        <span className="font-display text-pr-coqui">
                            {lang === "es" ? "Sonido" : "Sound"}
                        </span>
                        <button
                            type="button"
                            onClick={toggleMuted}
                            className={`rounded-md px-2 py-0.5 text-xs ${muted ? "bg-pr-red text-pr-white" : "bg-pr-coal-soft text-pr-ivory-dim"}`}
                        >
                            {muted
                                ? lang === "es"
                                    ? "Silenciado"
                                    : "Muted"
                                : lang === "es"
                                  ? "Activo"
                                  : "Live"}
                        </button>
                    </div>
                    <label className="flex flex-col gap-1">
                        <span className="text-[11px] uppercase tracking-wider text-pr-ivory-dim">
                            {lang === "es" ? "Volumen" : "Volume"} ·{" "}
                            {Math.round(masterVolume * 100)}%
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={masterVolume}
                            onChange={(e) => setMasterVolume(Number(e.target.value))}
                            className="accent-pr-coqui"
                        />
                    </label>
                    <label className="flex items-center justify-between gap-2">
                        <span className="text-xs">
                            {lang === "es" ? "Música" : "Music"}
                        </span>
                        <input
                            type="checkbox"
                            checked={musicEnabled}
                            onChange={(e) => setMusicEnabled(e.target.checked)}
                            className="h-4 w-4 accent-pr-coqui"
                        />
                    </label>
                    <label className="flex items-center justify-between gap-2">
                        <span className="text-xs">
                            {lang === "es" ? "Efectos" : "Sound effects"}
                        </span>
                        <input
                            type="checkbox"
                            checked={sfxEnabled}
                            onChange={(e) => setSfxEnabled(e.target.checked)}
                            className="h-4 w-4 accent-pr-coqui"
                        />
                    </label>
                    <p className="text-[10px] text-pr-ivory-dim">
                        {lang === "es"
                            ? "Para música de fondo, suelta un MP3 reggaetón en /public/audio/."
                            : "For background music, drop a reggaeton MP3 in /public/audio/."}
                    </p>
                </div>
            )}
        </div>
    );
}
