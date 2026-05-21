import { cronJobs } from "convex/server";
import { internal } from "./_generated/api.js";

const crons = cronJobs();

// Bootstraps the self-rescheduling scheduled functions. These run once on first deploy then
// re-arm themselves; the cron entries below are just the initial trigger.
crons.interval("kick autopass loop", { seconds: 30 }, internal.heartbeat.enforceAutoPass, {});
crons.interval(
    "kick steal-audit cleanup",
    { hours: 1 },
    internal.heartbeat.cleanupStealAudit,
    {},
);

export default crons;
