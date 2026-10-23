import { useEffect } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVoiceSession } from "./VoiceSession";
import { voiceTime } from "../../lib/voiceClient";

export default function VoiceMessage({ message, text, own = false, localUri, deletionProps, deleting = false }) {
  const session = useVoiceSession();
  const { removeMessage } = session;
  const id = message._id;
  useEffect(() => () => removeMessage(id), [id, removeMessage]);
  const active = session.activeId === id;
  const playing = active && session.status.playing;
  const loading = session.loadingId === id;
  const failed = session.errorId === id;
  const duration = message.audioDuration || 0;
  const progress = active && duration ? Math.min(1, session.status.currentTime / duration) : 0;
  const color = own ? "white" : "#334155";
  return <View style={{ minWidth: 190, maxWidth: "100%" }}>
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      <TouchableOpacity {...deletionProps} accessibilityRole="button" accessibilityLabel={loading ? text.voiceLoading : playing ? text.voicePause : failed ? text.voiceRetry : text.voicePlay}
        accessibilityState={{ disabled: deleting || loading || session.callState !== "idle", busy: loading || deleting }} disabled={deleting}
        onPress={() => { if (!loading && session.callState === "idle") void session.toggle(id, localUri, message.expiresAt); }} style={{ padding: 10 }}>
        {loading ? <ActivityIndicator color={color} /> : <Ionicons name={playing ? "pause" : "play"} size={24} color={color} />}
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View accessibilityRole="progressbar" accessibilityLabel={text.voiceProgress}
          accessibilityValue={{ min: 0, max: Math.ceil(duration), now: Math.floor(active ? session.status.currentTime : 0) }}
          style={{ height: 4, borderRadius: 2, backgroundColor: own ? "#ffffff55" : "#cbd5e1" }}>
          <View style={{ width: `${progress * 100}%`, height: 4, backgroundColor: color, borderRadius: 2 }} />
        </View>
        <Text style={{ color, fontSize: 12, marginTop: 5 }}>{voiceTime(active ? session.status.currentTime : duration)} / {voiceTime(duration)}</Text>
      </View>
    </View>
    {failed && <Text accessibilityRole="alert" style={{ color, fontSize: 12 }}>{text.voiceUnavailable}</Text>}
  </View>;
}
