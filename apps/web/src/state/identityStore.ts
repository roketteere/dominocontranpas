import { create } from "zustand";
import { defaultAvatarId, type AvatarId } from "../ui/avatars.js";

// Anonymous device-based identity. On first visit we mint a UUID into localStorage; subsequent
// visits reuse it. The Convex `users` table is keyed by this deviceId. Display name is freeform
// and editable from the lobby. Avatar is one of the preset AvatarIds.

const DEVICE_KEY = "dct.deviceId";
const NAME_KEY = "dct.displayName";
const AVATAR_KEY = "dct.avatar";

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

function loadAvatar(deviceId: string): AvatarId {
    try {
        const v = localStorage.getItem(AVATAR_KEY);
        if (v !== null && v.length > 0) return v as AvatarId;
    } catch {
        // ignore
    }
    return defaultAvatarId(deviceId);
}

function saveAvatar(id: AvatarId): void {
    try {
        localStorage.setItem(AVATAR_KEY, id);
    } catch {
        // best-effort
    }
}

export type IdentityState = {
    deviceId: string;
    displayName: string;
    avatar: AvatarId;
    setDisplayName: (name: string) => void;
    setAvatar: (id: AvatarId) => void;
};

const initialDeviceId = loadDeviceId();

export const useIdentityStore = create<IdentityState>((set) => ({
    deviceId: initialDeviceId,
    displayName: loadDisplayName(),
    avatar: loadAvatar(initialDeviceId),
    setDisplayName: (name) => {
        saveDisplayName(name);
        set({ displayName: name });
    },
    setAvatar: (id) => {
        saveAvatar(id);
        set({ avatar: id });
    },
}));
