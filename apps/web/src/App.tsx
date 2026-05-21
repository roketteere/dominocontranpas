import { useEffect } from "react";
import { ConvexProvider } from "convex/react";
import { useGameStore } from "./state/gameStore.js";
import { MainMenu } from "./ui/MainMenu.js";
import { Board } from "./ui/Board.js";
import { RoundEnd } from "./ui/RoundEnd.js";
import { MatchEnd } from "./ui/MatchEnd.js";
import { OnlineRoot } from "./ui/online/OnlineRoot.js";
import { AudioControls } from "./ui/AudioControls.js";
import { SettingsMenu } from "./ui/SettingsMenu.js";
import { LanguageMenu } from "./ui/LanguageMenu.js";
import { convex, isOnlineConfigured } from "./net/convexClient.js";
import { initMusic, setMusicContext, syncMusicVolume } from "./audio/musicPlayer.js";
import { installAudioUnlock } from "./audio/unlock.js";
import { useAudioStore } from "./audio/audioStore.js";
import { EnterOverlay } from "./ui/EnterOverlay.js";

export function App() {
    const screen = useGameStore((s) => s.screen);
    const entered = useAudioStore((s) => s.entered);
    const markEntered = useAudioStore((s) => s.markEntered);

    // Init the music playlist once on mount. Tracks are discovered via /audio/manifest.json
    // served by the audio-manifest Vite plugin. If the manifest is empty (no files dropped in)
    // the player silently no-ops. installAudioUnlock arms a one-shot listener that resumes the
    // AudioContext on the user's first gesture (browser autoplay policy).
    useEffect(() => {
        void initMusic();
        syncMusicVolume();
        installAudioUnlock();
    }, []);

    const onEnter = () => {
        markEntered();
        // The button click itself is the user gesture; installAudioUnlock's listener fires on
        // this same click. Kick the music explicitly so it starts immediately rather than
        // waiting for the next render cycle.
        void initMusic();
        syncMusicVolume();
    };

    // Switch the music context based on the current screen: lobby/menu screens use lobby tracks
    // (if any), gameplay uses gameplay tracks. Falls back to the other set if one is empty.
    useEffect(() => {
        if (screen === "menu" || screen === "online") {
            setMusicContext("lobby");
        } else {
            setMusicContext("gameplay");
        }
    }, [screen]);

    return (
        <ConvexProvider client={convex}>
            {!entered && <EnterOverlay onEnter={onEnter} />}
            <main className="relative z-10 mx-auto flex h-full max-w-4xl flex-col px-4 py-6">
                {screen === "menu" && <MainMenu />}
                {screen === "playing" && <Board />}
                {screen === "round_end" && <RoundEnd />}
                {screen === "match_end" && <MatchEnd />}
                {screen === "online" && (
                    isOnlineConfigured() ? (
                        <OnlineRoot />
                    ) : (
                        <OnlineUnconfigured />
                    )
                )}
            </main>
            <LanguageMenu />
            <div className="fixed right-3 top-3 z-30 flex items-center gap-2">
                <SettingsMenu />
                <AudioControls />
            </div>
            <Credit />
        </ConvexProvider>
    );
}

// Bottom-left attribution. Stays visible across every screen.
function Credit() {
    const year = new Date().getFullYear();
    return (
        <div className="fixed bottom-3 left-3 z-20 select-none text-[10px] leading-tight text-pr-ivory-dim/70">
            <div>By: Joel Pérez Santiago</div>
            <div>TeKi © {year}</div>
        </div>
    );
}

function OnlineUnconfigured() {
    const returnToMenu = useGameStore((s) => s.returnToMenu);
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <h2 className="font-display text-2xl text-pr-ivory">Online mode not configured</h2>
            <p className="max-w-md text-sm text-pr-ivory-dim">
                Set <code>VITE_CONVEX_URL</code> in <code>apps/web/.env.local</code> after running
                <code> pnpm --filter convex dev</code> once to provision the deployment.
            </p>
            <button
                type="button"
                onClick={returnToMenu}
                className="rounded-xl border border-pr-coal-soft px-6 py-2 text-pr-ivory hover:bg-pr-coal-soft"
            >
                Back to menu
            </button>
        </div>
    );
}
