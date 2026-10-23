import { initializeStreamPush } from "./lib/streamRuntime";
import { initializeFirebaseCalls } from "./lib/streamNotifications";
initializeStreamPush();
initializeFirebaseCalls();
// Register native push handlers before the router mounts.
require("expo-router/entry");
