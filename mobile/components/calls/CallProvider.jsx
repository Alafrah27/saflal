import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, AppState, PermissionsAndroid, Platform, Text, TouchableOpacity, View } from "react-native";
import { useAction, useQuery } from "convex/react";
import * as Crypto from "expo-crypto";
import * as Notifications from "expo-notifications";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { useAuthSession } from "../../context/AuthSessionContext";
import { useCallStore } from "../../store/callStore";
import { createStreamClient, disconnectStream, streamSDK } from "../../lib/streamRuntime";
import ChatQueryBoundary from "../chat/ChatQueryBoundary";
import { callError, callText } from "./callText";

const CallsContext = createContext(null);
export const useAudioCalls = () => useContext(CallsContext);
export const callRoute = callId => ({ pathname: "/call/voice", params: { callId } });

export default function CallProvider({ children }) {
  const { ready, profile } = useAuthSession();
  // Separate account-keyed lifetimes prevent a late promise crossing sign-in.
  return <SessionCalls key={ready ? profile._id : "signed-out"} ready={ready} profile={profile}>{children}</SessionCalls>;
}
function SessionCalls({ ready, profile, children }) {
  const [client, setClient] = useState(null), [error, setError] = useState(null), [revision, setRevision] = useState(0);
  const [starting, setStarting] = useState(false);
  const alive = useRef(true), pending = useRef(null), intent = useRef(null);
  const start = useAction(api.streamCalls.startCall);
  const router = useRouter();
  const { i18n } = useTranslation();
  const text = callText[i18n.language === "ar" ? "ar" : "en"];
  const insets = useSafeAreaInsets();
  useEffect(() => {
    alive.current = true;
    if (ready) createStreamClient().then(c => { if (alive.current) { setClient(c); setError(null); } }).catch(e => { if (alive.current) setError(e); });
    return () => { alive.current = false; useCallStore.getState().reset(); void disconnectStream(); };
  }, [ready, revision]);

  const startCall = useCallback(chatId => {
    if (pending.current) return pending.current;
    if (!ready || Platform.OS !== "android") { Alert.alert(text.history, text.setup); return Promise.resolve(); }
    if (!intent.current || intent.current.chatId !== chatId) intent.current = { chatId, requestId: Crypto.randomUUID() };
    setStarting(true);
    useCallStore.setState({ callState: "outgoing" });
    const run = (async () => {
      const c = await createStreamClient();
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) throw Error("microphone permission denied");
      await Notifications.requestPermissionsAsync();
      if (!alive.current) return;
      const result = await start(intent.current);
      if (!alive.current) return;
      setClient(c); setError(null); intent.current = null;
      router.push(callRoute(result.callId));
    })().catch(e => {
      // A structured server rejection is definitive. A new attempt needs a new
      // key; retain the old key only for uncertain network/transport failures.
      if (typeof e?.data === "string") intent.current = null;
      if (alive.current) { setError(e); Alert.alert(text.history, callError(e, text)); useCallStore.getState().reset(); }
    }).finally(() => { pending.current = null; if (alive.current) setStarting(false); });
    pending.current = run;
    return run;
  }, [ready, router, start, text]);
  const value = { client, error, starting, startCall, retry: () => setRevision(n => n + 1) };
  const body = <CallsContext.Provider value={value}>{children}
    {client && ready && <ChatQueryBoundary fallback={null}><CallsWatcher profile={profile} client={client} text={text} /></ChatQueryBoundary>}
  </CallsContext.Provider>;
  const native = streamSDK();
  return client && native ? <native.StreamVideo client={client} style={{ variants: { insets } }}>{body}</native.StreamVideo> : body;
}

function CallsWatcher({ profile, text }) {
  const current = useQuery(api.calls.current, {});
  const native = streamSDK();
  const calls = native.useCalls();
  const router = useRouter(), path = usePathname(), insets = useSafeAreaInsets();
  const surfaced = useRef(null);
  const sdkCall = calls.find(c => c.id === current?.streamCallId);
  useEffect(() => {
    const update = () => useCallStore.getState().setCall(current ? { ...current,
      status: sdkCall?.state.callingState === native.CallingState.JOINED ? "accepted" : current.status } : null);
    update();
    const subscription = sdkCall?.state.callingState$.subscribe(update);
    return () => subscription?.unsubscribe();
  }, [current, sdkCall, native]);
  useEffect(() => {
    if (!current) { surfaced.current = null; return; }
    if (current.direction === "incoming" && profile.notificationsEnabled !== false && surfaced.current !== current._id && AppState.currentState === "active") {
      surfaced.current = current._id;
      router.push(callRoute(current._id));
    }
  }, [current, router, profile.notificationsEnabled]);
  useEffect(() => {
    const open = response => {
      const data = response?.notification?.request?.content?.data;
      if (data?.kind === "saflal_missed_call" && data.recipientId === profile._id) router.push("/(tabs)/call");
    };
    const listener = Notifications.addNotificationResponseReceivedListener(open);
    void Notifications.getLastNotificationResponseAsync().then(open);
    return () => listener.remove();
  }, [profile._id, router]);
  // Stream's push adapter owns registration/rotation of the native FCM token.
  // Expo's existing message-notification registration remains separate.
  if (!current || path === "/call/voice") return null;
  if (current.direction === "incoming" && current.status === "ringing" && profile.notificationsEnabled === false) return null;
  return <View style={{ position: "absolute", left: 12, right: 12, top: insets.top + 4, backgroundColor: "#166534", borderRadius: 12, zIndex: 100 }}>
    <TouchableOpacity accessibilityRole="button" onPress={() => router.push(callRoute(current._id))} style={{ padding: 13 }}>
      <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>{text.open}</Text>
    </TouchableOpacity>
  </View>;
}
