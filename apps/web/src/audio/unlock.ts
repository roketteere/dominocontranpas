// Browser autoplay policy: an AudioContext can't actually produce sound until a user gesture.
// `installAudioUnlock` registers one-shot listeners on common gestures (pointerdown, keydown,
// touchstart) that resume the context + force the music to play. It removes itself after
// firing once.

import { syncMusicVolume, initMusic } from "./musicPlayer.js";

let installed = false;
let unlocked = false;

export function installAudioUnlock(): void {
    if (installed) return;
    installed = true;
    if (typeof window === "undefined") return;

    const unlock = () => {
        if (unlocked) return;
        unlocked = true;
        // Wake any pending AudioContext.
        try {
            const Ctor =
                window.AudioContext ??
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (Ctor !== undefined) {
                const tmpCtx = new Ctor();
                if (tmpCtx.state === "suspended") void tmpCtx.resume();
                // Play a single silent buffer to fully unlock on iOS Safari.
                const buf = tmpCtx.createBuffer(1, 1, 22050);
                const src = tmpCtx.createBufferSource();
                src.buffer = buf;
                src.connect(tmpCtx.destination);
                src.start(0);
            }
        } catch {
            // ignored
        }
        // Kick music. Re-init in case the manifest fetched before the gesture didn't get to
        // start playback (autoplay blocked).
        void initMusic();
        syncMusicVolume();
        for (const ev of EVENTS) {
            window.removeEventListener(ev, unlock);
        }
    };

    const EVENTS: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart"];
    for (const ev of EVENTS) {
        window.addEventListener(ev, unlock, { once: false, passive: true });
    }
}
