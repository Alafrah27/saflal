import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ActionModal from "./ActionModel";

export default function ListDeletionControls({ deletion }) {
  const { active, selected, dialog, pending, error, text, isArabic, kind, cancel, open, close, confirm } = deletion;
  return <>
    {active && <View style={{ backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: "#f0f0f0", gap: 8 }}>
      <View style={{ flexDirection: isArabic ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.cancel} disabled={pending} onPress={cancel} style={{ padding: 10 }}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text accessibilityLiveRegion="polite" style={{ flex: 1, color: "#1f2937", fontSize: 17, fontWeight: "700", textAlign: isArabic ? "right" : "left" }}>{text.selected(selected.size)}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.remove} disabled={pending} onPress={open}
          style={{ backgroundColor: "#fef2f2", borderRadius: 16, padding: 12 }}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>
      {!!error && !dialog && <Text accessibilityRole="alert" style={{ color: "#dc2626", textAlign: isArabic ? "right" : "left" }}>{error}</Text>}
    </View>}
    {!!dialog && <ActionModal visible onClose={close} title={kind === "chat" ? text.chatTitle : text.callTitle}
      description={(kind === "chat" ? text.chatBody : text.callBody)(dialog.length)} cancelLabel={text.cancel}
      actionLabel={pending ? text.deleting : error ? text.retry : text.remove} isDangerous isLoading={pending}
      error={error} isArabic={isArabic} closeOnConfirm={false} onHandleFn={confirm} />}
  </>;
}
