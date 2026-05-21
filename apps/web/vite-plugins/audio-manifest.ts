import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

// Generates /audio/manifest.json listing every audio file in apps/web/public/audio/.
//
// In dev: served as Vite middleware so a freshly-dropped file shows up on next request without
// a server restart.
// At build: writes a static manifest.json into the build output so the playlist works in prod.
//
// Files are grouped into "lobby" (filename starts with "lobby") and "gameplay" (everything
// else). Supported extensions: mp3, wav, m4a, mp4, ogg, aac, flac, webm.

const AUDIO_EXT = /\.(mp3|wav|m4a|mp4|ogg|aac|flac|webm)$/i;

function buildManifest(audioDir: string): { lobby: string[]; gameplay: string[] } {
    let entries: string[] = [];
    try {
        entries = fs.readdirSync(audioDir).filter((f) => AUDIO_EXT.test(f));
    } catch {
        entries = [];
    }
    const lobby = entries.filter((f) => /^lobby[\W_]/i.test(f) || /^lobby\./i.test(f));
    const gameplay = entries.filter((f) => !lobby.includes(f));
    return { lobby, gameplay };
}

export function audioManifestPlugin(): Plugin {
    const audioDir = path.resolve("public/audio");
    return {
        name: "dct-audio-manifest",
        configureServer(server) {
            server.middlewares.use("/audio/manifest.json", (_req, res) => {
                const manifest = buildManifest(audioDir);
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Cache-Control", "no-store");
                res.end(JSON.stringify(manifest));
            });
        },
        writeBundle(_options, _bundle) {
            // For prod builds, write a static manifest into dist/audio/.
            const outDir = path.resolve("dist/audio");
            try {
                fs.mkdirSync(outDir, { recursive: true });
                fs.writeFileSync(
                    path.join(outDir, "manifest.json"),
                    JSON.stringify(buildManifest(audioDir), null, 2),
                );
            } catch {
                // Build runs even if /public/audio doesn't exist — just skip the manifest.
            }
        },
    };
}
