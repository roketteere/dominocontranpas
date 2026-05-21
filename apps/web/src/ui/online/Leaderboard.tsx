import { useState } from "react";
import { useQuery } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import { useGameStore } from "../../state/gameStore.js";
import { useOnlineStore } from "../../state/onlineGameStore.js";
import { useIdentityStore } from "../../state/identityStore.js";
import { PlayerAvatar } from "../PlayerAvatar.js";

type Tab = "world" | "friends";

type Entry = {
    userId: string;
    displayName: string;
    avatar: string | undefined;
    wins: number;
    losses: number;
    gamesPlayed: number;
    winRate: number;
    title: string;
    isMe?: boolean;
};

function Row({ rank, entry, isMe }: { rank: number; entry: Entry; isMe: boolean }) {
    return (
        <div
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                isMe
                    ? "bg-pr-coqui/15 ring-1 ring-pr-coqui/40"
                    : "bg-pr-coal-soft/50"
            }`}
        >
            <span className="w-6 text-center text-sm font-bold text-pr-ivory-dim">{rank}</span>
            <PlayerAvatar avatarId={entry.avatar} size="sm" />
            <div className="flex flex-1 flex-col">
                <span className="text-sm text-pr-ivory">{entry.displayName}</span>
                <span className="text-[11px] text-pr-ivory-dim">{entry.title}</span>
            </div>
            <div className="text-right">
                <div className="text-sm font-bold text-pr-ivory">{entry.wins}W</div>
                <div className="text-[11px] text-pr-ivory-dim">{entry.winRate}%</div>
            </div>
        </div>
    );
}

export function Leaderboard() {
    const lang = useGameStore((s) => s.lang);
    const setScreen = useOnlineStore((s) => s.setScreen);
    const deviceId = useIdentityStore((s) => s.deviceId);

    const [tab, setTab] = useState<Tab>("world");

    const me = useQuery(api.users.getUserByDeviceId, { deviceId });
    const worldBoard = useQuery(api.stats.getLeaderboard, { limit: 50 });
    const friendsBoard = useQuery(
        api.stats.getFriendsLeaderboard,
        me ? { userId: me._id } : "skip",
    );
    const myStats = useQuery(api.stats.getMyStats, me ? { userId: me._id } : "skip");

    const es = lang === "es";
    const entries: Entry[] =
        tab === "world" ? (worldBoard ?? []) : (friendsBoard ?? []);

    return (
        <div className="flex flex-1 flex-col gap-3 p-3">
            {/* Header */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setScreen("lobby-hub")}
                    className="rounded-lg px-2 py-1 text-pr-ivory-dim hover:text-pr-ivory"
                >
                    ←
                </button>
                <h2 className="font-display text-xl text-pr-ivory">
                    {es ? "Tabla de posiciones" : "Leaderboard"}
                </h2>
            </div>

            {/* My stats card */}
            {myStats && (
                <div className="flex items-center gap-3 rounded-xl bg-pr-coal-soft/70 px-3 py-2.5">
                    {me?.avatar && <PlayerAvatar avatarId={me.avatar} size="sm" />}
                    <div className="flex flex-1 flex-col">
                        <span className="text-sm font-semibold text-pr-ivory">
                            {myStats.title}
                        </span>
                        <span className="text-[11px] text-pr-ivory-dim">
                            {myStats.wins}W · {myStats.losses}L · {myStats.winRate}%
                        </span>
                    </div>
                    {myStats.stealCount > 0 && (
                        <span className="rounded-md bg-pr-red/20 px-2 py-0.5 text-[11px] font-bold text-pr-red">
                            El Tranpista
                        </span>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-pr-coal-soft/40 p-1">
                {(["world", "friends"] as Tab[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                            tab === t
                                ? "bg-pr-coal-soft text-pr-ivory"
                                : "text-pr-ivory-dim hover:text-pr-ivory"
                        }`}
                    >
                        {t === "world"
                            ? es
                                ? "Mundial"
                                : "World"
                            : es
                              ? "Amigos"
                              : "Friends"}
                    </button>
                ))}
            </div>

            {/* Entries */}
            <div className="flex flex-col gap-2 overflow-y-auto">
                {entries.length === 0 ? (
                    <p className="py-8 text-center text-sm text-pr-ivory-dim">
                        {es ? "Aún no hay datos" : "No data yet"}
                    </p>
                ) : (
                    entries.map((entry, i) => (
                        <Row
                            key={entry.userId}
                            rank={i + 1}
                            entry={entry}
                            isMe={
                                entry.isMe === true ||
                                (me !== null &&
                                    me !== undefined &&
                                    entry.userId === (me._id as unknown as string))
                            }
                        />
                    ))
                )}
            </div>
        </div>
    );
}
