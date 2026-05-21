import { useAudioStore, effectiveVolume } from "./audioStore.js";

// Singleton AudioContext. Browsers require it be created on a user gesture, so we lazily
// instantiate on the first play* call. If that call happens outside a gesture, the context
// will be in "suspended" state — call resume() optimistically.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
    if (ctx !== null) return ctx;
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctor === undefined) return null;
    ctx = new Ctor();
    return ctx;
}

function gateGain(): GainNode | null {
    const c = getCtx();
    if (c === null) return null;
    if (c.state === "suspended") void c.resume();
    const state = useAudioStore.getState();
    if (!state.sfxEnabled || state.muted) return null;
    const g = c.createGain();
    g.gain.value = effectiveVolume(state) * 0.6; // SFX bus is a bit lower than master so it doesn't overwhelm music
    g.connect(c.destination);
    return g;
}

// A short percussive click for placing a tile. Sine sweep with quick decay.
export function playClick(): void {
    const c = getCtx();
    const out = gateGain();
    if (c === null || out === null) return;
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(720, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.08);
    const env = c.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(1, t0 + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
    osc.connect(env);
    env.connect(out);
    osc.start(t0);
    osc.stop(t0 + 0.2);
}

// Descending swoosh: a steal happening. Filtered noise.
export function playSwoosh(): void {
    const c = getCtx();
    const out = gateGain();
    if (c === null || out === null) return;
    const t0 = c.currentTime;
    const bufferSize = Math.floor(c.sampleRate * 0.3);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2400, t0);
    filter.frequency.exponentialRampToValueAtTime(360, t0 + 0.28);
    filter.Q.value = 6;
    const env = c.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(0.8, t0 + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    noise.connect(filter);
    filter.connect(env);
    env.connect(out);
    noise.start(t0);
    noise.stop(t0 + 0.32);
}

// Fanfare-ish triad for round / match win.
export function playFanfare(): void {
    const c = getCtx();
    const out = gateGain();
    if (c === null || out === null) return;
    const t0 = c.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
        const start = t0 + i * 0.09;
        const osc = c.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const env = c.createGain();
        env.gain.setValueAtTime(0, start);
        env.gain.linearRampToValueAtTime(0.4, start + 0.04);
        env.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
        osc.connect(env);
        env.connect(out);
        osc.start(start);
        osc.stop(start + 0.8);
    });
}

// Low resigned tone for a forced pass.
export function playPass(): void {
    const c = getCtx();
    const out = gateGain();
    if (c === null || out === null) return;
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t0);
    osc.frequency.exponentialRampToValueAtTime(110, t0 + 0.22);
    const env = c.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(0.5, t0 + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
    osc.connect(env);
    env.connect(out);
    osc.start(t0);
    osc.stop(t0 + 0.3);
}

// Coquí chirp — two short rising tones, a signature PR sound.
export function playCoqui(): void {
    const c = getCtx();
    const out = gateGain();
    if (c === null || out === null) return;
    const t0 = c.currentTime;
    const playChirp = (start: number, freq: number) => {
        const osc = c.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq * 0.9, start);
        osc.frequency.exponentialRampToValueAtTime(freq, start + 0.08);
        const env = c.createGain();
        env.gain.setValueAtTime(0, start);
        env.gain.linearRampToValueAtTime(0.35, start + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
        osc.connect(env);
        env.connect(out);
        osc.start(start);
        osc.stop(start + 0.18);
    };
    playChirp(t0, 1320);
    playChirp(t0 + 0.18, 1760);
}
