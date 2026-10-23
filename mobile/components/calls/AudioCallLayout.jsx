import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { displayName } from "../../shared/displayName";

// Shared presentation for ringing, connected, loading and ended audio calls.
// Navigation only minimizes the screen; the existing call owner handles media.
export function AudioCallFrame({ peer, label, text, children }) {
  const router = useRouter(), insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [failedImage, setFailedImage] = useState(null);
  const imageUrl = peer?.imageUrl;
  const hasImage = imageUrl && imageUrl !== failedImage;

  return <View style={[styles.screen, { direction: isArabic ? "rtl" : "ltr" }]}>
    <StatusBar style="light" />
    {hasImage ? <Image key={imageUrl} source={{ uri: imageUrl }} resizeMode="cover" accessible={false}
      style={StyleSheet.absoluteFill} onError={() => setFailedImage(imageUrl)} />
      : <View pointerEvents="none" style={styles.placeholder}>
        <View style={styles.initialCircle}>
          <Text style={styles.initial}>{displayName(peer).trim().charAt(0).toUpperCase() || "☎"}</Text>
        </View>
      </View>}
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs><LinearGradient id="call-shade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#080d15" stopOpacity="0.82" />
          <Stop offset="0.4" stopColor="#080d15" stopOpacity="0.12" />
          <Stop offset="0.65" stopColor="#080d15" stopOpacity="0.18" />
          <Stop offset="1" stopColor="#080d15" stopOpacity="0.94" />
        </LinearGradient></Defs>
        <Rect width="100%" height="100%" fill="url(#call-shade)" />
      </Svg>
    </View>
    <ScrollView style={styles.scroll} bounces={false} showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, {
        paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28,
        paddingLeft: Math.max(24, insets.left + 12), paddingRight: Math.max(24, insets.right + 12),
      }]}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.back}
          onPress={() => router.back()} style={styles.back} activeOpacity={0.7}>
          <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={25} color="white" />
        </TouchableOpacity>
        <Text style={styles.brand}>Saflal</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.identity}>
        <Text accessibilityRole="header" style={styles.name}>{displayName(peer, text.unavailableUser)}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.status}>{label}</Text>
      </View>
      <View style={styles.spacer} />
      <View style={styles.controls}>{children}</View>
    </ScrollView>
  </View>;
}

export function AudioCallControl({ icon, label, onPress, color = "#ffffff26", disabled = false, hangup = false, selected }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled, ...(selected !== undefined ? { selected } : {}) }}
    disabled={disabled} onPress={onPress} activeOpacity={0.75}
    style={[styles.control, { opacity: disabled ? 0.45 : 1 }]}>
    <View style={[styles.controlCircle, { backgroundColor: selected ? "white" : color }]}>
      <Ionicons name={icon} color={selected ? "#17212b" : "white"} size={30}
        style={hangup ? { transform: [{ rotate: "135deg" }] } : undefined} />
    </View>
    <Text style={styles.controlLabel}>{label}</Text>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#15202b" },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "#293a47" },
  initialCircle: { width: 190, height: 190, borderRadius: 95, alignItems: "center", justifyContent: "center", backgroundColor: "#b8814440", borderWidth: 1, borderColor: "#ffffff20" },
  initial: { color: "#fff", fontSize: 88, fontWeight: "600" },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#00000040", borderWidth: 1, borderColor: "#ffffff26" },
  brand: { flex: 1, textAlign: "center", color: "#fff", fontSize: 16, fontWeight: "600", letterSpacing: 1.5 },
  headerSpacer: { width: 48 },
  identity: { alignItems: "center", paddingTop: 30, gap: 12 },
  name: { color: "#fff", fontSize: 32, fontWeight: "700", textAlign: "center", textShadowColor: "#00000050", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  status: { color: "#f1f5f9", fontSize: 17, textAlign: "center", fontVariant: ["tabular-nums"] },
  spacer: { flex: 1, minHeight: 40 },
  controls: { width: "100%", maxWidth: 420, alignSelf: "center", alignItems: "center", paddingTop: 24 },
  control: { alignItems: "center", flexShrink: 1, paddingHorizontal: 6, paddingVertical: 4, minWidth: 80, maxWidth: 128 },
  controlCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#ffffff20" },
  controlLabel: { color: "#fff", fontSize: 13, fontWeight: "600", marginTop: 12, textAlign: "center" },
});
