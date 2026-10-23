import { Platform, TurboModuleRegistry } from "react-native";
import { getClerkInstance } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

export const CALL_TYPE = "saflal_audio";
export const PUSH_PROVIDER = process.env.EXPO_PUBLIC_STREAM_ANDROID_PUSH_PROVIDER || "saflal-android";
const clientOptions = { rejectCallWhenBusy: true, logLevel: "error" };
let sdk, clientPromise, currentClient, generation = 0;
let pushReady = false, nativeSetupFailed = false;
export function streamSDK() {
  if (Platform.OS !== "android" || nativeSetupFailed) return null;
  if (!sdk) {
    try {
      // Installing JS packages cannot add Callingx to an older native binary.
      // Use the nullable registry lookup before importing its enforcing module.
      if (!TurboModuleRegistry.get("Callingx")) return null;
      sdk = require("@stream-io/video-react-native-sdk");
    } catch { return null; }
  }
  return sdk;
}
async function authenticatedConvex() {
  const clerk = getClerkInstance({ publishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, tokenCache });
  await clerk.load();
  const session = clerk.session;
  if (!session) throw Error("CALL_AUTH_REQUIRED");
  const sessionId = session.id;
  let token = await session.getToken();
  if (!token) throw Error("CALL_AUTH_REQUIRED");
  let claims;
  try { claims = JSON.parse(globalThis.atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { throw Error("CALL_AUTH_REQUIRED"); }
  if (claims.aud !== "convex") token = await session.getToken({ template: "convex" });
  if (!token || clerk.session?.id !== sessionId) throw Error("CALL_AUTH_REQUIRED");
  const http = new ConvexHttpClient(process.env.EXPO_PUBLIC_CONVEX_URL);
  http.setAuth(token);
  return { http, sessionId, clerk };
}
export async function callBackend(kind, reference, args = {}) {
  const { http } = await authenticatedConvex();
  return http[kind](reference, args);
}
export async function createStreamClient() {
  if (clientPromise) return clientPromise;
  const version = generation;
  clientPromise = (async () => {
    const native = streamSDK();
    if (!native || !initializeStreamPush()) throw Error("CALL_NATIVE_BUILD_REQUIRED");
    const { http, clerk, sessionId } = await authenticatedConvex();
    const session = await http.action(api.streamCalls.getStreamSession, {});
    if (generation !== version || clerk.session?.id !== sessionId) throw Error("CALL_AUTH_REQUIRED");
    const tokenProvider = async () => {
      const next = await authenticatedConvex();
      if (next.sessionId !== sessionId || generation !== version) throw Error("CALL_AUTH_REQUIRED");
      return (await next.http.action(api.streamCalls.getStreamSession, {})).token;
    };
    currentClient = native.StreamVideoClient.getOrCreateInstance({ ...session, options: clientOptions, tokenProvider });
    return currentClient;
  })().catch(error => { clientPromise = null; throw error; });
  return clientPromise;
}
export async function disconnectStream() {
  generation += 1;
  const client = currentClient;
  currentClient = null; clientPromise = null;
  await streamSDK()?.StreamVideoRN.onPushLogout().catch(() => {});
  if (client) await client.disconnectUser().catch(() => {});
}
export function initializeStreamPush() {
  if (pushReady) return true;
  const native = streamSDK(); if (!native) return false;
  try {
    // Register authorization before native push can create/join a call.
    native.StreamVideoRN.setRingingCallLifecycleHooks({
      onBeforeCallJoin: async call => {
        if (call.type !== CALL_TYPE) throw Error("CALL_UNAVAILABLE");
        const row = await callBackend("query", api.calls.getByStreamId, { streamCallId: call.id });
        if (!row) throw Error("CALL_UNAVAILABLE");
        await callBackend("query", api.calls.authorizeJoin, { callId: row._id });
        await call.camera.disable();
      },
    });
    native.StreamVideoRN.setPushConfig({
      android: { pushProviderName: PUSH_PROVIDER, enableOngoingCalls: true,
        skipIncomingPushInForeground: true, defaultDeviceEndpointType: "earpiece",
        incomingChannel: { id: "saflal-incoming-calls", name: "Saflal calls", vibration: true } },
      shouldRejectCallWhenBusy: true,
      createStreamVideoClient: async () => { try { return await createStreamClient(); } catch { return undefined; } },
    });
    pushReady = true;
    return true;
  } catch {
    // setPushConfig can retain partial state after a native setup failure.
    // Keep the app usable and report CALL_NATIVE_BUILD_REQUIRED on call attempts.
    nativeSetupFailed = true;
    return false;
  }
}
