import { useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
// @ts-ignore — stub overwritten by `convex dev`
import { api } from "@convex/_generated/api.js";
import type { Id } from "../net/convexIds.js";
import { useIdentityStore } from "../state/identityStore.js";

// Reactive subscription to the server's filtered game view. Returns null until the server
// responds. Calling this hook also bumps the seat's lastSeenAt every 15s while mounted.
export function useOnlineGame(gameId: Id<"games"> | null) {
    const deviceId = useIdentityStore((s) => s.deviceId);
    const displayName = useIdentityStore((s) => s.displayName);

    // Look up our user row by deviceId. Will return null until the server creates it.
    const me = useQuery(api.users.getUserByDeviceId, { deviceId });
    const myUserId = me?._id ?? null;

    const view = useQuery(
        api.views.myGameView,
        gameId !== null && myUserId !== null ? { gameId, userId: myUserId } : "skip",
    );

    const pingSeat = useMutation(api.heartbeat.pingSeat);
    useEffect(() => {
        if (gameId === null || myUserId === null) return;
        const tick = () => {
            void pingSeat({ gameId, userId: myUserId });
        };
        tick();
        const id = setInterval(tick, 15_000);
        return () => clearInterval(id);
    }, [gameId, myUserId, pingSeat]);

    return useMemo(
        () => ({ view: view ?? null, myUserId, displayName }),
        [view, myUserId, displayName],
    );
}
