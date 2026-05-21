import { create } from "zustand";
import type { Id } from "../net/convexIds.js";

// Online-mode session state. Tracks which game (if any) the user is in and which lobby step
// they're on. The actual GameState comes reactively from Convex via useOnlineGame; this store
// just holds the navigation + IDs.

export type OnlineScreen =
    | "name-setup"
    | "lobby-hub"
    | "create-game"
    | "join-game"
    | "seat-picker"
    | "playing"
    | "round_end"
    | "match_end"
    | "friends"
    | "leaderboard";

export type OnlineState = {
    screen: OnlineScreen;
    gameId: Id<"games"> | null;
    roomCode: string | null;
    setScreen: (s: OnlineScreen) => void;
    setGame: (gameId: Id<"games">, roomCode: string) => void;
    resumeGame: (gameId: Id<"games">, roomCode: string, phase: string) => void;
    clearGame: () => void;
};

export const useOnlineStore = create<OnlineState>((set) => ({
    screen: "lobby-hub",
    gameId: null,
    roomCode: null,
    setScreen: (s) => set({ screen: s }),
    setGame: (gameId, roomCode) => set({ gameId, roomCode, screen: "seat-picker" }),
    resumeGame: (gameId, roomCode, phase) => {
        const screen: OnlineScreen =
            phase === "lobby"
                ? "seat-picker"
                : phase === "match_end"
                  ? "match_end"
                  : "playing";
        set({ gameId, roomCode, screen });
    },
    clearGame: () => set({ gameId: null, roomCode: null, screen: "lobby-hub" }),
}));
