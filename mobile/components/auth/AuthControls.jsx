import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput } from "react-native";
export function AuthButton({ title, onPress, disabled = false, secondary = false, busy = false, icon = null }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={[styles.button, secondary && styles.secondary, (disabled || busy) && { opacity: 0.5 }]}>
    {busy ? <ActivityIndicator color="#111827" /> : <>{icon}<Text style={styles.label}>{title}</Text></>}
  </Pressable>;
}
export function AuthInput(props) {
  return <TextInput placeholderTextColor="#64748b" style={styles.input} {...props} />;
}
export function AuthError({ message }) {
  return message ? <Text accessibilityRole="alert" style={{ color: "#b91c1c", textAlign: "center" }}>{message}</Text> : null;
}
const styles = StyleSheet.create({
  button: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#b88144", padding: 17, borderRadius: 32, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12, minHeight: 56 },
  secondary: {   borderWidth: 1, borderColor: "#d1d5db" },
  label: { color: "#111827", fontWeight: "600", fontSize: 16, flexShrink: 1, textAlign: "center" },
  input: { backgroundColor: "#fff", padding: 17, borderRadius: 18, color: "#111827", fontSize: 16 },
});
