import { useGameStore } from "../state/gameStore.js";

// Fullscreen entry gate. The user has to click the Enter button before the app reveals — that
// click acts as the user gesture browsers require for AudioContext.resume() and HTMLAudioElement
// playback, so music starts immediately on entry.
export function EnterOverlay({ onEnter }: { onEnter: () => void }) {
    const lang = useGameStore((s) => s.lang);
    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
            style={{
                background:
                    "radial-gradient(ellipse at center, var(--color-pr-table) 0%, var(--color-pr-table-dark) 100%)",
            }}
        >
            <div className="flex max-w-md flex-col items-center gap-6 text-center">
                <span className="text-[11px] uppercase tracking-[0.3em] text-pr-coqui">
                    🇵🇷 BORINQUEN 🐸
                </span>
                <h1 className="font-display text-6xl leading-none">
                    <span className="text-pr-red">Dominos</span>{" "}
                    <span className="text-pr-ivory-dim">Con</span>{" "}
                    <span className="text-pr-blue">Tranpas</span>
                </h1>
                <button
                    type="button"
                    onClick={onEnter}
                    autoFocus
                    className="rounded-2xl bg-pr-coqui px-12 py-4 font-display text-3xl text-pr-coal shadow-2xl shadow-pr-coqui/40 transition-transform hover:scale-105 active:scale-95"
                >
                    {lang === "es" ? "Entrar" : "Enter"}
                </button>
                <p className="text-sm text-pr-ivory-dim">
                    {lang === "es"
                        ? "Toca para empezar · la música arranca contigo"
                        : "Tap to start · music kicks in with you"}
                </p>
                <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-pr-ivory-dim/70">
                    Joel Pérez Santiago — TeKi
                </p>
            </div>
        </div>
    );
}
