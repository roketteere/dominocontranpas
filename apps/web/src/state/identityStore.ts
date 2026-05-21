import { create } from "zustand";

// Anonymous device-based identity. On first visit we mint a UUID into localStorage; subsequent
// visits reuse it. The Convex `users` table is keyed by this deviceId. Display name is freeform
// and editable from the lobby.

const DEVICE_KEY = "dct.deviceId";
const NAME_KEY = "dct.displayName";

function loadDeviceId(): string {
    try {
        const existing = localStorage.getItem(DEVICE_KEY);
        if (existing !== null && existing !== "") return existing;
        const fresh = crypto.randomUUID();
        localStorage.setItem(DEVICE_KEY, fresh);
        return fresh;
    } catch {
        // localStorage unavailable (private mode, harness). Fall back to a session-only id.
        return crypto.randomUUID();
    }
}

function loadDisplayName(): string {
    try {
        return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
        return "";
    }
}

function saveDisplayName(name: string): void {
    try {
        localStorage.setItem(NAME_KEY, name);
    } catch {
        // best-effort
    }
}

export type IdentityState = {
    deviceId: string;
    displayName: string;
    setDisplayName: (name: string) => void;
};

export const useIdentityStore = create<IdentityState>((set) => ({
    deviceId: loadDeviceId(),
    displayName: loadDisplayName(),
    setDisplayName: (name) => {
        saveDisplayName(name);
        set({ displayName: name });
    },
}));
