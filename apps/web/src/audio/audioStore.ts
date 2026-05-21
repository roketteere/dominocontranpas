import { create } from "zustand";

const MASTER_KEY = "dct.audio.master";
const MUTED_KEY = "dct.audio.muted";
const MUSIC_KEY = "dct.audio.music";
const SFX_KEY = "dct.audio.sfx";

function loadNumber(key: string, fallback: number): number {
    try {
        const v = localStorage.getItem(key);
        if (v === null) return fallback;
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    } catch {
        return fallback;
    }
}
function loadBool(key: string, fallback: boolean): boolean {
    try {
        const v = localStorage.getItem(key);
        if (v === null) return fallback;
        return v === "true";
    } catch {
        return fallback;
    }
}
function saveString(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // best-effort
    }
}

export type AudioState = {
    masterVolume: number; // 0..1
    muted: boolean;
    musicEnabled: boolean;
    sfxEnabled: boolean;
    setMasterVolume: (v: number) => void;
    setMuted: (m: boolean) => void;
    toggleMuted: () => void;
    setMusicEnabled: (e: boolean) => void;
    setSfxEnabled: (e: boolean) => void;
};

export const useAudioStore = create<AudioState>((set, get) => ({
    masterVolume: loadNumber(MASTER_KEY, 0.4),
    muted: loadBool(MUTED_KEY, false),
    musicEnabled: loadBool(MUSIC_KEY, true),
    sfxEnabled: loadBool(SFX_KEY, true),
    setMasterVolume: (v) => {
        const clamped = Math.max(0, Math.min(1, v));
        saveString(MASTER_KEY, String(clamped));
        set({ masterVolume: clamped });
    },
    setMuted: (m) => {
        saveString(MUTED_KEY, String(m));
        set({ muted: m });
    },
    toggleMuted: () => {
        const next = !get().muted;
        saveString(MUTED_KEY, String(next));
        set({ muted: next });
    },
    setMusicEnabled: (e) => {
        saveString(MUSIC_KEY, String(e));
        set({ musicEnabled: e });
    },
    setSfxEnabled: (e) => {
        saveString(SFX_KEY, String(e));
        set({ sfxEnabled: e });
    },
}));

// Helper: the effective volume any audio source should use right now.
export function effectiveVolume(state: AudioState): number {
    return state.muted ? 0 : state.masterVolume;
}
