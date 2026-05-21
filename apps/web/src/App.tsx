import { ConvexProvider } from "convex/react";
import { useGameStore } from "./state/gameStore.js";
import { MainMenu } from "./ui/MainMenu.js";
import { Board } from "./ui/Board.js";
import { RoundEnd } from "./ui/RoundEnd.js";
import { MatchEnd } from "./ui/MatchEnd.js";
import { OnlineRoot } from "./ui/online/OnlineRoot.js";
import { convex, isOnlineConfigured } from "./net/convexClient.js";

export function App() {
    const screen = useGameStore((s) => s.screen);

    return (
        <ConvexProvider client={convex}>
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
        </ConvexProvider>
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
