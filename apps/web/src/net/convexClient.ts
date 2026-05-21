import { ConvexReactClient } from "convex/react";

// Vite injects VITE_CONVEX_URL at build time. In dev, run `pnpm --filter convex dev` once to
// provision a deployment; that command will print the URL and (per Convex docs) write a local
// .env that Vite picks up automatically.
const url = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (url === undefined || url === "") {
    // We surface a clear error rather than letting Convex's own one bubble; otherwise the
    // failure mode (silent subscription that never fires) is hard to debug.
    console.warn(
        "VITE_CONVEX_URL is not set. Online multiplayer will be disabled. Run `pnpm --filter convex dev` once to provision the deployment.",
    );
}

export const convex = new ConvexReactClient(url ?? "https://placeholder.convex.cloud");

export const isOnlineConfigured = (): boolean => url !== undefined && url !== "";
