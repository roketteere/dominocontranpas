import { useGameStore } from "./state/gameStore.js";
import { MainMenu } from "./ui/MainMenu.js";
import { Board } from "./ui/Board.js";
import { RoundEnd } from "./ui/RoundEnd.js";
import { MatchEnd } from "./ui/MatchEnd.js";

export function App() {
    const screen = useGameStore((s) => s.screen);

    return (
        <main className="relative z-10 mx-auto flex h-full max-w-4xl flex-col px-4 py-6">
            {screen === "menu" && <MainMenu />}
            {screen === "playing" && <Board />}
            {screen === "round_end" && <RoundEnd />}
            {screen === "match_end" && <MatchEnd />}
        </main>
    );
}
