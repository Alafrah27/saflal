import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../convex/_generated/api";
import { callBackend, streamSDK } from "./streamRuntime";
import { displayName } from "../shared/displayName";

export async function handleStreamMessage(message) {
  const data = message.data;
  if (data?.sender !== "stream.video") return;
  if (!["call.ring", "call.missed"].includes(data.type)) return;
  const user = await callBackend("query", api.users.current, {});
  if (!user?.isActive || user.notificationsEnabled === false) return;
  if (data.type === "call.ring") { await streamSDK()?.firebaseDataHandler(data); return; }
  if (data.type !== "call.missed") return;
  const prefix = "saflal_audio:";
  if (!data.call_cid?.startsWith(prefix)) return;
  const call = await callBackend("query", api.calls.getByStreamId, { streamCallId: data.call_cid.slice(prefix.length) });
  if (!call || call.historyVisible === false || call.direction !== "incoming" || call.outcome === "unavailable") return;
  const key = `saflal_call_push_${call.receiverId}`;
  const recent = JSON.parse(await AsyncStorage.getItem(key) || "[]");
  if (recent.includes(call._id)) return;
  await AsyncStorage.setItem(key, JSON.stringify([...recent.slice(-49), call._id]));
  await Notifications.setNotificationChannelAsync("saflal-missed-calls", { name: "Missed calls", importance: Notifications.AndroidImportance.DEFAULT });
  await Notifications.scheduleNotificationAsync({ identifier: `missed-${call._id}`,
    content: { title: "Saflal", body: `Missed audio call: ${displayName(call.peer, "Contact")}`,
      data: { kind: "saflal_missed_call", recipientId: call.receiverId, callId: call._id } }, trigger: { channelId: "saflal-missed-calls" } });
}
export function initializeFirebaseCalls() {
  if (Platform.OS !== "android") return;
  try {
    const { getMessaging, setBackgroundMessageHandler, onMessage } = require("@react-native-firebase/messaging");
    const messaging = getMessaging();
    setBackgroundMessageHandler(messaging, async message => { try { await handleStreamMessage(message); } catch { /* stale push or signed out */ } });
    onMessage(messaging, message => {
      if (message.data?.type === "call.ring" && AppState.currentState === "active") return;
      void handleStreamMessage(message).catch(() => {});
    });
  } catch { /* Requires a rebuilt native binary. */ }
}
