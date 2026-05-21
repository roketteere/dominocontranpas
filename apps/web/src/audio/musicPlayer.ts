import { useAudioStore, effectiveVolume } from "./audioStore.js";

// Background-music player with playlist support.
//
// Tracks are discovered at runtime by GETing /audio/manifest.json (served by the audio-manifest
// Vite plugin in dev, written to dist/ at build). The manifest groups files by filename prefix:
// `lobby-*` → lobby context; everything else → gameplay. Just drop audio files into
// `apps/web/public/audio/` — mp3 / wav / m4a / mp4 / ogg / aac / flac / webm all supported.
//
// At runtime the player:
//   - Maintains a shuffled queue for the current context
//   - Plays one track at a time, auto-advancing on `ended`
//   - Switches context (lobby ↔ gameplay) when callers ask, picking a new track if the
//     previous track wasn't in the new context's set
//   - Silently no-ops if the manifest is empty or absent

type Context = "lobby" | "gameplay";
type Manifest = { lobby: string[]; gameplay: string[] };

let el: HTMLAudioElement | null = null;
let manifest: Manifest = { lobby: [], gameplay: [] };
let manifestLoaded = false;
let context: Context = "gameplay";
let queue: string[] = [];
let currentTrack: string | null = null;
// Last track to actually start playing. Used to prevent an immediate repeat when the queue
// reshuffles for a new round.
let lastPlayed: string | null = null;

function getEl(): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;
    if (el !== null) return el;
    el = new Audio();
    el.loop = false; // we manage looping at the playlist level, not per-track
    el.preload = "auto";
    el.addEventListener("ended", () => advance());
    el.addEventListener("error", () => advance());
    return el;
}

function shuffle<T>(arr: readonly T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const a = out[i];
        const b = out[j];
        if (a === undefined || b === undefined) continue;
        out[i] = b;
        out[j] = a;
    }
    return out;
}

function buildQueue(): void {
    const pool = manifest[context];
    if (pool.length === 0) {
        // Empty context: fall back to the OTHER context if it has tracks. Better some music than
        // none.
        const other: Context = context === "lobby" ? "gameplay" : "lobby";
        queue = shuffle(manifest[other]);
    } else {
        queue = shuffle(pool);
    }
    // Avoid an immediate repeat across the round boundary. If the freshly shuffled queue starts
    // with the song that just finished, swap it with a random later entry. (Only does anything
    // when the pool has 2+ tracks.)
    if (queue.length > 1 && lastPlayed !== null && queue[0] === lastPlayed) {
        const swapWith = 1 + Math.floor(Math.random() * (queue.length - 1));
        const head = queue[0];
        const swap = queue[swapWith];
        if (head !== undefined && swap !== undefined) {
            queue[0] = swap;
            queue[swapWith] = head;
        }
    }
}

function nextTrackName(): string | null {
    if (queue.length === 0) buildQueue();
    const next = queue.shift() ?? null;
    if (next !== null) lastPlayed = next;
    return next;
}

function trackUrl(name: string): string {
    // Encode each path segment so spaces / special chars survive.
    return `/audio/${encodeURIComponent(name)}`;
}

function advance(): void {
    const audio = getEl();
    if (audio === null) return;
    const next = nextTrackName();
    if (next === null) {
        currentTrack = null;
        return;
    }
    currentTrack = next;
    audio.src = trackUrl(next);
    audio.load();
    syncMusicVolume();
    void audio.play().catch(() => {
        // Autoplay may still be blocked until first gesture; the unlock module handles that.
    });
}

async function loadManifest(): Promise<void> {
    if (manifestLoaded) return;
    manifestLoaded = true;
    try {
        const resp = await fetch("/audio/manifest.json", { cache: "no-store" });
        if (!resp.ok) return;
        const data = (await resp.json()) as Partial<Manifest>;
        manifest = {
            lobby: Array.isArray(data.lobby) ? data.lobby : [],
            gameplay: Array.isArray(data.gameplay) ? data.gameplay : [],
        };
    } catch {
        // Network failed or JSON malformed — leave manifest empty.
    }
}

// Public API ----------------------------------------------------------------------------------

// Called once on app mount. Loads the manifest then kicks off the first track in the default
// context. The track won't actually start until the audio unlock has fired (browser autoplay).
export async function initMusic(): Promise<void> {
    await loadManifest();
    if (currentTrack === null) advance();
}

// Switch context (lobby ↔ gameplay). If the current track is in the new context's set, keep
// playing it. Otherwise rebuild the queue and start a fresh track.
export function setMusicContext(next: Context): void {
    if (context === next) return;
    context = next;
    const inNewSet =
        currentTrack !== null && manifest[next].includes(currentTrack);
    if (!inNewSet) {
        queue = [];
        advance();
    }
}

// Skip to the next track immediately (e.g. for a "next song" button).
export function skipTrack(): void {
    advance();
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
        if (audio.paused && currentTrack !== null) {
            void audio.play().catch(() => {});
        }
    }
}

// Subscribe to store changes so volume + enabled flips propagate.
useAudioStore.subscribe(() => syncMusicVolume());

// Legacy single-track entry point retained for callers that haven't switched to context-based
// playback yet. Calls through to the playlist with a manifest-bypass: if you pass a non-null
// src, that one file plays in a loop.
export function setMusicTrack(src: string | null): void {
    const audio = getEl();
    if (audio === null) return;
    if (src === null) {
        audio.pause();
        audio.removeAttribute("src");
        currentTrack = null;
        return;
    }
    // If the caller passes a specific track, treat it as a one-off loop (no playlist advance).
    audio.loop = true;
    audio.src = src;
    audio.load();
    currentTrack = src;
    syncMusicVolume();
    void audio.play().catch(() => {});
}
