import { useGameStore } from "../state/gameStore.js";
import { useT } from "../i18n/index.js";

export function MainMenu() {
    const startSoloMatch = useGameStore((s) => s.startSoloMatch);
    const lang = useGameStore((s) => s.lang);
    const t = useT();
    const goOnline = () => useGameStore.setState({ screen: "online" });
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
            <header className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-2xl">
                    <span aria-hidden>🇵🇷</span>
                    <span className="text-[11px] uppercase tracking-[0.3em] text-pr-coqui">
                        {lang === "es" ? "Hecho en Borinquen" : "Made in Borinquen"}
                    </span>
                    <span aria-hidden>🐸</span>
                </div>
                <h1 className="font-display text-5xl text-pr-ivory">
                    <span className="text-pr-red">Dominos</span>{" "}
                    <span className="text-pr-ivory-dim">Con</span>{" "}
                    <span className="text-pr-blue">Tranpas</span>
                </h1>
                <p className="text-sm text-pr-ivory-dim">{t("appTagline")}</p>
            </header>

            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={() => startSoloMatch({ enableTranpas: true })}
                    className="rounded-xl bg-pr-blue px-8 py-3 font-display text-lg text-pr-white shadow-lg shadow-pr-blue/30 transition-transform hover:scale-105 active:scale-95"
                >
                    {lang === "es" ? "Solo vs IA · Con Tranpas" : "Solo vs AI · With Tranpas"}
                </button>
                <button
                    type="button"
                    onClick={() => startSoloMatch({ enableTranpas: false })}
                    className="rounded-xl border-2 border-pr-blue/60 bg-pr-blue/10 px-8 py-2 font-display text-sm text-pr-ivory transition-transform hover:bg-pr-blue/20 active:scale-95"
                >
                    {lang === "es"
                        ? "Solo vs IA · Clásico (sin robos)"
                        : "Solo vs AI · Classic (no stealing)"}
                </button>
                <button
                    type="button"
                    onClick={goOnline}
                    className="rounded-xl bg-pr-red px-8 py-3 font-display text-lg text-pr-white shadow-lg shadow-pr-red/30 transition-transform hover:scale-105 active:scale-95"
                >
                    {lang === "es" ? "Jugar en línea" : "Play online"}
                </button>
            </div>

            <section className="max-w-md space-y-3 rounded-2xl border border-pr-coal-soft bg-pr-coal-soft/30 p-5 text-left text-[12px] leading-relaxed text-pr-ivory">
                <h2 className="font-display text-base text-pr-coqui">{t("helpHeading")}</h2>
                <ul className="space-y-2 text-pr-ivory-dim">
                    <li>{t("helpStealMechanic")}</li>
                    <li>{t("helpImmunity")}</li>
                    <li>{t("helpCapicua")}</li>
                    <li>{t("helpChuchazo")}</li>
                    <li>{t("helpTranca")}</li>
                    <li>{t("helpZapato")}</li>
                </ul>
            </section>

            <footer className="space-y-1 text-[11px] text-pr-ivory-dim">
                <p>{t("rulesLine1")}</p>
                <p>{t("rulesLine2")}</p>
                <p>{t("rulesLine3")}</p>
            </footer>
        </div>
    );
}
