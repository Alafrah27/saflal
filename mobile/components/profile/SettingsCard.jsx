import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** @type {import("react-native").ViewStyle} */
export const settingsGroupStyle = { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#f0f0f0", borderRadius: 18, overflow: "hidden" };

// Reusable for navigation buttons, read-only account details, or trailing controls.
/** @param {{ icon: import("react").ComponentProps<typeof Ionicons>["name"], title: string, subtitle?: string, onPress?: () => void, children?: import("react").ReactNode, disabled?: boolean, isArabic?: boolean, selectable?: boolean, grouped?: boolean, divider?: boolean, accessibilityRole?: import("react-native").AccessibilityRole, destructive?: boolean }} props */
export default function SettingsCard({ icon, title, subtitle, onPress, children, disabled = false, isArabic = false, selectable = false, grouped = false, divider = false, accessibilityRole = "button", destructive = false }) {
  const Container = onPress ? TouchableOpacity : View;
  return <Container {...(onPress ? { onPress, disabled, activeOpacity: 0.7, accessibilityRole,
    accessibilityLabel: `${title}${subtitle ? `: ${subtitle}` : ""}`, accessibilityState: { disabled } } : {})}
    style={{ direction: isArabic ? "rtl" : "ltr", flexDirection: "row", alignItems: "center", gap: 14,
      padding: 16, minHeight: 80, backgroundColor: grouped ? "transparent" : "#f9fafb",
      borderWidth: grouped ? 0 : 1, borderColor: "#f0f0f0", borderRadius: grouped ? 0 : 18,
      ...(grouped && divider ? { borderTopWidth: 1 } : {}),
      opacity: disabled ? 0.6 : 1 }}>
    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: destructive ? "#fef2f2" : "#b8814414", alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={22} color={destructive ? "#ef4444" : "#b88144"} />
    </View>
    <View style={{ flex: 1, gap: 5, alignItems: "flex-start" }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: destructive ? "#ef4444" : "#1f2937", textAlign: isArabic ? "right" : "left", writingDirection: isArabic ? "rtl" : "ltr" }}>{title}</Text>
      {!!subtitle && <Text selectable={selectable} style={{ fontSize: 13, color: "#6b7280", textAlign: isArabic ? "right" : "left", writingDirection: selectable ? "auto" : isArabic ? "rtl" : "ltr" }}>{subtitle}</Text>}
    </View>
    {children ?? (onPress ? <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={19} color="#9ca3af" /> : null)}
  </Container>;
}
