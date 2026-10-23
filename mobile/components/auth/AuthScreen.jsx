import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

export default function AuthScreen({ title, subtitle, children = null, footer = null }) {
  const { i18n } = useTranslation();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={[styles.card, footer && styles.hero]}>
          <Text style={[styles.title, { writingDirection: i18n.language === "ar" ? "rtl" : "ltr" }]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </View>
        {footer && <View style={styles.footer}>{footer}</View>}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#e8e8ea" },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 480, alignSelf: "center", gap: 18 },
  hero: { flex: 1, justifyContent: "center", paddingVertical: 32 },
  footer: { width: "100%", maxWidth: 480, alignSelf: "center", gap: 14, paddingTop: 24 },
  title: { fontSize: 30, fontWeight: "700", textAlign: "center", color: "#111827" },
  subtitle: { fontSize: 16, textAlign: "center", color: "#64748b", lineHeight: 24 },
});
