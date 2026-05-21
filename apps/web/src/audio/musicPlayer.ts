import { useAudioStore, effectiveVolume } from "./audioStore.js";

// Background-music singleton. Loops a track from /audio/. If the file is missing the element
// just stays silent — no exceptions thrown.
//
// Drop reggaeton-style royalty-free MP3s into `apps/web/public/audio/`:
//   - reggaeton-loop.mp3   (primary background, looped)
//   - lobby-loop.mp3       (optional, for lobby screens)

let el: HTMLAudioElement | null = null;
let currentSrc: string | null = null;

function getEl(): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;
    if (el !== null) return el;
    el = new Audio();
    el.loop = true;
    el.preload = "auto";
    return el;
}

export function setMusicTrack(src: string | null): void {
    const audio = getEl();
    if (audio === null) return;
    if (currentSrc === src) return;
    currentSrc = src;
    if (src === null) {
        audio.pause();
        audio.removeAttribute("src");
        return;
    }
    audio.src = src;
    audio.load();
    void audio.play().catch(() => {
        // Browser may have blocked autoplay; ignore — user gesture will resume it.
    });
}

export function syncMusicVolume(): void {
    const audio = getEl();
    if (audio === null) return;
    const state = useAudioStore.getState();
    const v = state.musicEnabled ? effectiveVolume(state) * 0.5 : 0;
    audio.volume = Math.max(0, Math.min(1, v));
    if (v === 0) {
        if (!audio.paused) audio.pause();
    } else {
        if (audio.paused && currentSrc !== null) {
            void audio.play().catch(() => {});
        }
    }
}

// Subscribe to store changes so volume + enabled flips propagate.
useAudioStore.subscribe(() => syncMusicVolume());
