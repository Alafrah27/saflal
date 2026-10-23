import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
const client = new ConvexHttpClient(process.env.EXPO_PUBLIC_CONVEX_URL, { logger: false });
assert.equal(await client.query(makeFunctionReference("users:current"), {}), null);
console.log("PASS: anonymous current-user query returns null.");
await assert.rejects(client.mutation(makeFunctionReference("users:completeProfile"), {
  fullName: "Unauthorized Probe",
}), /UNAUTHENTICATED/);
console.log("PASS: deployed profile creation rejects unauthenticated callers.");
await assert.rejects(client.mutation(makeFunctionReference("users:applyClerkProfile"), {
  clerkId: "unauthorized_probe", disabled: false,
}));
console.log("PASS: internal Clerk synchronization cannot be called by a public client.");
