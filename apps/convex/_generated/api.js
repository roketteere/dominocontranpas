// STUB — overwritten by `pnpm --filter convex dev` on first run.
// Exists only so the web bundle can resolve `@convex/_generated/api.js` before the real
// codegen has happened. Calls through `api.*` / `internal.*` will look up functions by name
// at runtime against the actual deployment.
import { anyApi } from "convex/server";
export const api = anyApi;
export const internal = anyApi;
