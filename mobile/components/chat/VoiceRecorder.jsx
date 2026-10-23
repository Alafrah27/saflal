import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Alert, AppState, Platform, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { usePreventRemove } from "expo-router/react-navigation";
import { useNavigation } from "expo-router";
import { useMutation } from "convex/react";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { randomUUID } from "expo-crypto";
import { fetch as expoFetch } from "expo/fetch";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { useVoiceSession } from "./VoiceSession";
import VoiceMessage from "./VoiceMessage";
import { authenticatedVoiceFetch, readVoiceRecording, voiceTime } from "../../lib/voiceClient";
import { createVoiceRecorder } from "../../lib/voiceRecorder";
import { useCallStore } from "../../store/callStore";
import { claimVoiceRecorder, releaseVoiceRecorder } from "../../lib/voiceActivity";

const options = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 };
const circle = { width: 48, height: 48, borderRadius: 24, backgroundColor: "#b88144", alignItems: "center", justifyContent: "center" };
function VoiceButton({ label, icon, onPress, disabled = false }) {
  return <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled }} style={{ ...circle, opacity: disabled ? 0.5 : 1 }}>
    <Ionicons name={icon} color="white" size={22} />
  </TouchableOpacity>;
}

export default function VoiceRecorder({ chatId, text, onPhaseChange }) {
  const session = useVoiceSession();
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const begin = useMutation(api.voice.beginAudioUpload);
  const cancel = useMutation(api.voice.cancelAudioUpload);
  const send = useMutation(api.messages.sendAudio);
  const [view, setView] = useState({ phase: "idle", clip: null, error: null });
  const [screenReader, setScreenReader] = useState(false);
  const controller = useRef(null);
  const native = useAudioRecorder(options, status => {
    if (status.isFinished || status.hasError) void controller.current?.complete(status);
  });
  const nativeState = useAudioRecorderState(native, 100);
  const latest = useRef(null);
  useEffect(() => { latest.current = { session, begin, cancel, send }; }, [session, begin, cancel, send]);
  useEffect(() => {
    const owner = Symbol("voice-recorder");
    const current = createVoiceRecorder({
      recorder: native, uuid: randomUUID, change: setView,
      canUseAudio: () => Platform.OS !== "web" && navigation.isFocused() && AppState.currentState === "active" && useCallStore.getState().callState === "idle",
      canReleaseAudio: () => useCallStore.getState().callState === "idle",
      acquire: () => claimVoiceRecorder(owner), release: () => releaseVoiceRecorder(owner),
      permission: ask => ask ? AudioModule.requestRecordingPermissionsAsync() : AudioModule.getRecordingPermissionsAsync(),
      mode: allowsRecording => setAudioModeAsync({
        allowsRecording, playsInSilentMode: true, shouldPlayInBackground: false,
        shouldRecordInBackground: false, interruptionMode: "doNotMix"
      }),
      recording: value => latest.current.session.setRecording(value),
      stopPlayback: () => latest.current.session.stopPlayback(),
      begin: clientMessageId => latest.current.begin({ chatId, clientMessageId }),
      cancel: uploadId => latest.current.cancel({ uploadId }),
      upload: async (clip, signal) => {
        // Expo fetch reads only this recorder's temporary URI as raw bytes.
        // No file picker or filesystem module is involved.
        const bytes = await readVoiceRecording(expoFetch, clip.uri, signal);
        return await authenticatedVoiceFetch(expoFetch, latest.current.session.getToken,
          `/voice/upload?uploadId=${encodeURIComponent(clip.uploadId)}`, {
          method: "POST", body: bytes, signal, headers: { "Content-Type": "audio/mp4" },
        });
      },
      send: clip => latest.current.send({ chatId, uploadId: clip.uploadId, clientMessageId: clip.clientMessageId }),
    });
    controller.current = current;
    const subscription = AppState.addEventListener("change", value => { if (value !== "active") void current.interrupt(); });
    const blur = navigation.addListener("blur", () => { void current.interrupt(); });
    return () => { subscription.remove(); blur(); current.dispose(); controller.current = null; };
  }, [chatId, native, navigation]);
  useEffect(() => { if (controller.current) controller.current.state.duration = nativeState.durationMillis / 1000; }, [nativeState.durationMillis]);
  useEffect(() => {
    if (session.callState !== "idle") void controller.current?.interrupt();
  }, [session.callState]);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled().then(value => { if (active) setScreenReader(value); });
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => { onPhaseChange(view.phase); }, [view.phase, onPhaseChange]);
  useEffect(() => () => onPhaseChange("idle"), [onPhaseChange]);
  usePreventRemove(!!view.clip, ({ data }) => {
    Alert.alert(text.voiceDiscardTitle, text.voiceDiscardBody, [
      { text: text.voiceKeep, style: "cancel" },
      { text: text.voiceDelete, style: "destructive", onPress: () => { controller.current?.discard(); navigation.dispatch(data.action); } },
    ]);
  });

  const recording = ["preparing", "recording", "locked", "stopping"].includes(view.phase);
  const accessibleRecording = view.phase === "locked";
  const sending = view.phase === "sending";
  const recovering = view.phase === "preview" && !!view.clip;
  const unavailable = session.callState !== "idle" || Platform.OS === "web" ||
    (view.phase !== "idle" && !accessibleRecording);
  const accessiblePress = () => {
    if (unavailable) return;
    if (accessibleRecording) void controller.current?.finish("send");
    else void controller.current?.start(true);
  };
  return <View style={{ width: recovering ? undefined : 48, flex: recovering ? 1 : undefined }}>
    {view.error && <Text accessibilityRole="alert" style={{
      color: "#b91c1c", marginBottom: 6,
      position: "absolute", bottom: 56, right: 0, width: Math.min(320, width - 32), padding: 8, backgroundColor: "#fff", borderRadius: 8
    }}>{text[view.error]}</Text>}
    {recovering ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <VoiceButton label={text.voiceDelete} icon="trash-outline" onPress={() => controller.current?.discard()} />
      <View style={{ flex: 1 }}><VoiceMessage message={{ _id: `preview-${view.clip.clientMessageId}`, audioDuration: view.clip.duration }} localUri={view.clip.uri} text={text} /></View>
      <VoiceButton label={text.voiceSend} icon="send" onPress={() => controller.current?.send()} />
    </View> : <>
      {recording && <View pointerEvents="none" style={{
        position: "absolute", bottom: 0, right: 56,
        width: Math.max(100, width - 104), minHeight: 48, justifyContent: "center"
      }}>
        <Text style={{ color: "#b91c1c" }}>{voiceTime(nativeState.durationMillis / 1000)}</Text>
        <Text style={{ color: "#64748b", fontSize: 12 }}>{screenReader ? text.voiceAccessible : text.voiceGesture}</Text>
      </View>}
      {sending && <Text accessibilityLiveRegion="polite" style={{
        position: "absolute", right: 56, bottom: 12,
        width: Math.max(100, width - 104), color: "#64748b"
      }}>{text.voiceSending}</Text>}
      {screenReader ? <VoiceButton label={accessibleRecording ? text.voiceStop : sending ? text.voiceSending : text.voiceStart} icon={accessibleRecording ? "stop" : "mic"}
        onPress={accessiblePress} disabled={unavailable} />
        : <View testID="voice-mic" accessible accessibilityRole="button" accessibilityLabel={sending ? text.voiceSending : text.voiceStart}
          onStartShouldSetResponder={() => !unavailable}
          onResponderGrant={() => { if (!unavailable) void controller.current?.start(); }}
          onResponderRelease={() => { void controller.current?.release(); }}
          onResponderTerminate={() => { void controller.current?.interrupt(); }}
          onResponderTerminationRequest={() => false}
          accessibilityHint={text.voiceGesture} accessibilityState={{ disabled: unavailable, busy: sending }}
          onAccessibilityTap={accessiblePress}
          style={{
            ...circle, backgroundColor: recording ? "#b91c1c" : circle.backgroundColor,
            opacity: unavailable && !recording && !sending ? 0.5 : 1
          }}>
          {sending || view.phase === "preparing" || view.phase === "stopping" ? <ActivityIndicator color="white" /> : <Ionicons name="mic" size={24} color="white" />}
        </View>}
    </>}
  </View>;
}
