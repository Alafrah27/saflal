import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, BackHandler, PermissionsAndroid, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useConvex } from "convex/react";
import { useTranslation } from "react-i18next";
import { useAudioPlayer } from "expo-audio";
import { api } from "../../convex/_generated/api";
import { CALL_TYPE, streamSDK } from "../../lib/streamRuntime";
import { useAudioCalls } from "../../components/calls/CallProvider";
import { callError, callText } from "../../components/calls/callText";
import ChatQueryBoundary from "../../components/chat/ChatQueryBoundary";
import { useAuthSession } from "../../context/AuthSessionContext";
import { AudioCallFrame as CallFrame, AudioCallControl as Control } from "../../components/calls/AudioCallLayout";

export default function VoiceCallScreen() {
  const { callId } = useLocalSearchParams();
  const calls = useAudioCalls();
  const { i18n } = useTranslation();
  const text = callText[i18n.language === "ar" ? "ar" : "en"];
  const fallback = <CallFrame text={text} label={calls?.error ? callError(calls.error, text) : text.unavailable}>
    {calls?.error && <TouchableOpacity accessibilityRole="button" onPress={calls.retry} style={{ padding: 20 }}><Text style={{ color: "white", textAlign: "center" }}>{text.retry}</Text></TouchableOpacity>}
  </CallFrame>;
  if (typeof callId !== "string" || !calls?.client || !streamSDK()) return fallback;
  return <ChatQueryBoundary fallback={fallback}><ConnectedCall callId={callId} client={calls.client} text={text} /></ChatQueryBoundary>;
}
function ConnectedCall({ callId, client, text }) {
  const row = useQuery(api.calls.getCall, { callId });
  const [call, setCall] = useState(null), [error, setError] = useState(null);
  const created = useRef(null), convex = useConvex();
  const native = streamSDK();
  useEffect(() => {
    if (!row || created.current === callId) return;
    created.current = callId;
    if (!["ringing", "accepted"].includes(row.status)) return;
    const c = client.call(CALL_TYPE, row.streamCallId, { reuseInstance: true });
    setCall(c);
    c.setDisconnectionTimeout(60);
    (async () => {
      await convex.query(api.calls.authorizeJoin, { callId });
      await c.get(row.direction === "outgoing" && row.status === "ringing" && !c.ringing ? { ring: true, video: false } : undefined);
      await c.camera.disable();
      // A caller recovered after acceptance must join; native accepted calls may already be joined.
      if (row.status === "accepted" && ![native.CallingState.JOINED, native.CallingState.JOINING].includes(c.state.callingState)) await c.join();
    })().catch(e => setError(e));
    // Calls survive navigation. The session provider/server owns end/logout cleanup.
  }, [callId, client, row, native, convex]);
  if (call) return <native.StreamCall call={call}><CallPanel row={row} text={text} initialError={error} /></native.StreamCall>;
  return <CallPanel row={row} text={text} initialError={error} />;
}
function CallPanel({ row, text, initialError }) {
  const native = streamSDK();
  const call = native.useCall();
  const { useCallCallingState, useMicrophoneState, useRemoteParticipants } = native.useCallStateHooks();
  // This component is only inside StreamCall while live. Terminal views use a separate component.
  if (!call) return <TerminalCall row={row} text={text} />;
  return <LiveCall row={row} text={text} initialError={initialError} call={call}
    state={useCallCallingState()} microphone={useMicrophoneState()} participants={useRemoteParticipants()} />;
}
function TerminalCall({ row, text }) {
  const label = !row || row.status === "accepted" ? text.connecting
    : row.status === "ringing" ? row.direction === "incoming" ? text.incoming : text.calling : outcomeLabel(row, text);
  return <CallFrame peer={row?.peer} text={text} label={label}>
    {!row && <ActivityIndicator color="#b88144" />}
  </CallFrame>;
}
function LiveCall({ row, text, initialError, call, state, microphone, participants }) {
  const { profile } = useAuthSession();
  const router = useRouter(), native = streamSDK(), convex = useConvex();
  const decline = useMutation(api.calls.decline), cancel = useMutation(api.calls.cancel), end = useMutation(api.calls.end);
  const [error, setError] = useState(null), [working, setWorking] = useState(false), [now, setNow] = useState(Date.now());
  const [connectedAt, setConnectedAt] = useState(null), [appState, setAppState] = useState(AppState.currentState);
  const audio = native.useAudioDeviceStatus();
  const ringtone = useAudioPlayer(require("../../assets/sounds/call-ring.wav"));
  const terminal = row && !["ringing", "accepted"].includes(row.status);
  const joined = state === native.CallingState.JOINED;
  const incoming = row?.direction === "incoming";
  const waiting = !terminal && !joined && row?.status === "ringing" && !working;
  useEffect(() => {
    const listener = AppState.addEventListener("change", setAppState);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { listener.remove(); clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (joined && participants.length && !connectedAt) setConnectedAt(Date.now());
  }, [joined, participants.length, connectedAt]);
  useEffect(() => {
    if (waiting && incoming && appState === "active" && profile?.notificationsEnabled !== false) { ringtone.loop = true; ringtone.play(); }
    else ringtone.pause();
    return () => { try { ringtone.pause(); } catch {} };
  }, [waiting, incoming, ringtone, appState, profile?.notificationsEnabled]);
  useEffect(() => {
    if (terminal && call.state.callingState !== native.CallingState.LEFT) void call.leave().catch(() => {});
  }, [terminal, call, native]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { router.back(); return true; });
    return () => subscription.remove();
  }, [router]);
  const perform = async fn => {
    if (working) return;
    setWorking(true); setError(null);
    try { ringtone.pause(); await fn(); } catch (e) { setError(e); } finally { setWorking(false); }
  };
  const hangup = () => perform(async () => {
    if (joined || row.status === "accepted") await end({ callId: row._id });
    else if (incoming) await decline({ callId: row._id });
    else await cancel({ callId: row._id });
    if (call.state.callingState !== native.CallingState.LEFT) await call.leave({ reject: !joined, reason: incoming ? "decline" : "cancel" });
  });
  const accept = () => perform(async () => {
    const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (permission !== PermissionsAndroid.RESULTS.GRANTED) throw Error("microphone permission denied");
    await convex.query(api.calls.authorizeJoin, { callId: row._id });
    await call.camera.disable();
    if (![native.CallingState.JOINED, native.CallingState.JOINING].includes(call.state.callingState)) await call.join();
  });
  const chooseAudio = () => Alert.alert(text.output, undefined, (audio?.devices ?? []).map(device => ({
    text: `${device.id === audio.selectedDeviceId ? "✓ " : ""}${device.name}`,
    onPress: () => void perform(() => native.callManager.audioDevices.select(device.id)),
  })));
  const started = row?.startedAt ?? connectedAt;
  let label = terminal ? outcomeLabel(row, text) : incoming && waiting ? text.incoming : text.calling;
  if (!terminal && [native.CallingState.RECONNECTING, native.CallingState.OFFLINE].includes(state)) label = text.reconnecting;
  else if (!terminal && joined) label = started && participants.length ? duration(Math.max(0, Math.floor((now - started) / 1000))) : text.connecting;
  else if (!terminal && state === native.CallingState.JOINING) label = text.connecting;
  else if (!terminal && [native.CallingState.RECONNECTING_FAILED, native.CallingState.LEFT].includes(state)) label = text.failed;
  return <CallFrame peer={row?.peer} label={label} text={text}>
    {(error || initialError) && <Text accessibilityRole="alert" style={{ color: "#fca5a5", textAlign: "center", marginBottom: 20 }}>{callError(error || initialError, text)}</Text>}
    {!terminal && <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-evenly", width: "100%" }}>
        {incoming && waiting && <Control icon="call" label={text.decline} color="#ef4444" hangup disabled={working} onPress={hangup} />}
        {joined && <Control icon={microphone.isMute ? "mic-off" : "mic"} label={microphone.isMute ? text.unmute : text.mute}
          selected={microphone.isMute} disabled={working} onPress={() => perform(() => call.microphone.toggle())} />}
        {incoming && waiting ? <Control icon="call" label={text.accept} color="#16a34a" disabled={working} onPress={accept} />
          : <Control icon="call" label={joined || row?.status === "accepted" ? text.end : incoming ? text.decline : text.cancel} color="#ef4444" hangup disabled={working} onPress={hangup} />}
        {joined && <Control icon="volume-high" label={text.output} disabled={working || !audio?.devices?.length} onPress={chooseAudio} />}
      </View>
      {working && <ActivityIndicator style={{ marginTop: 20 }} color="#b88144" />}
    </>}
  </CallFrame>;
}
export function duration(seconds) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
export function outcomeLabel(row, text) { return row.outcome === "cancelled" ? text.cancelled : row.outcome === "busy" ? text.busy : row.status === "missed" ? text.missed : row.status === "rejected" ? text.rejected : row.status === "failed" ? text.failed : text.ended; }
