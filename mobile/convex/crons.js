import { cronJobs } from "convex/server";
import { internal } from "./_generated/api.js";

const crons = cronJobs();
crons.interval("Recover account deletion", { minutes: 1 }, internal.accountDeletion.recover, {});
crons.interval("Recover audio calls", { minutes: 1 }, internal.calls.recover, {});
crons.interval("Recover push deliveries", { minutes: 1 }, internal.push.tick, {});
crons.interval("Clean terminal push deliveries", { hours: 1 }, internal.push.cleanup, {});
crons.interval("Clean abandoned voice uploads", { minutes: 15 }, internal.voice.cleanup, {});
crons.interval("Clean tagged voice orphans and expired audio", { hours: 24 }, internal.voice.sweepOrphans, { cursor: null });
export default crons;
