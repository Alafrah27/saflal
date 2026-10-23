import { Ionicons } from "@expo/vector-icons";

export default function MessageReceipt({ status, text, onBubble = false }) {
  if (status !== "sent" && status !== "read") return null;
  const read = status === "read";
  return <Ionicons name={read ? "checkmark-done" : "checkmark"} size={16}
    accessibilityLabel={read ? text.messageRead : text.messageSent}
    color={read ? "#60a5fa" : onBubble ? "#ffffffcc" : "#9ca3af"} />;
}
