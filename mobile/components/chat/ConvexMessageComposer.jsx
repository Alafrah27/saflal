import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMutation } from "convex/react";
import { randomUUID } from "expo-crypto";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import VoiceRecorder from "./VoiceRecorder";

export default function ConvexMessageComposer({ chatId, text }) {
  const send = useMutation(api.messages.sendText);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [voicePhase, setVoicePhase] = useState("idle");
  const voiceBusy = voicePhase !== "idle";
  const busy = useRef(false);
  const attempt = useRef(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const submit = async () => {
    const body = draft.trim();
    if (!body || draft.length > 4000 || busy.current) return;
    busy.current = true;
    setSending(true); setError(false);
    try {
      // An uncertain network result can be retried without creating a duplicate.
      if (attempt.current?.text !== body) attempt.current = { text: body, clientMessageId: randomUUID() };
      await send({ chatId, ...attempt.current });
      if (mounted.current) { setDraft(""); attempt.current = null; }
    } catch {
      if (mounted.current) setError(true);
    } finally {
      busy.current = false;
      if (mounted.current) setSending(false);
    }
  };
  const disabled = sending || !draft.trim() || draft.length > 4000;
  return <View style={{ padding: 10 }}>
    {error && <Text accessibilityRole="alert" style={{ color: "#b91c1c", marginBottom: 8 }}>{text.sendError}</Text>}
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      <View pointerEvents={voiceBusy ? "none" : "auto"} accessibilityElementsHidden={voiceBusy}
        importantForAccessibility={voiceBusy ? "no-hide-descendants" : "auto"}
        style={{
          flex: 1, display: voicePhase === "preview" ? "none" : "flex", opacity: voiceBusy ? 0 : 1,
          borderRadius: 24, backgroundColor: "white", paddingHorizontal: 16
        }}>
        <TextInput value={draft} onChangeText={value => { if (!busy.current) setDraft(value); }}
          editable={!sending && !voiceBusy} multiline maxLength={4000} placeholder={text.placeholder} accessibilityLabel={text.placeholder}
          style={{ minHeight: 48, maxHeight: 120, paddingVertical: 12, color: "#1e293b" }} />
      </View>
      {draft.trim() ? <TouchableOpacity disabled={disabled} onPress={submit} accessibilityRole="button"
        accessibilityState={{ disabled, busy: sending }} accessibilityLabel={text.send}
        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#b88144", opacity: disabled ? 0.5 : 1, alignItems: "center", justifyContent: "center" }}>
        {sending ? <ActivityIndicator color="white" /> : <Ionicons name="send" size={20} color="white" />}
      </TouchableOpacity> : <VoiceRecorder chatId={chatId} text={text} onPhaseChange={setVoicePhase} />}
    </View>
  </View>;
}
