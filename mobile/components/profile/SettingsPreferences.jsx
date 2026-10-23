import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Linking, Modal, Switch, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import * as Notifications from "expo-notifications";
import { api } from "../../convex/_generated/api";
import { useAuthSession } from "../../context/AuthSessionContext";
import { useContextProvider } from "../../context/LngContext";
import { useCallStore } from "../../store/callStore";
import SettingsCard, { settingsGroupStyle as groupStyle } from "./SettingsCard";
import { settingsText } from "./settingsText";
import { useRouter } from "expo-router";
import { profileText } from "./profileText";

const websiteUrl = "http://localhost:5173";

export function notificationPermissionAllowed(permission) {
  const ios = permission?.ios?.status;
  return permission?.granted === true || permission?.status === "granted" ||
    (ios !== undefined && [Notifications.IosAuthorizationStatus.PROVISIONAL, Notifications.IosAuthorizationStatus.EPHEMERAL].includes(ios));
}

export default function SettingsPreferences() {
  const router = useRouter();
  const { ready, profile, clerkUser } = useAuthSession();
  const { changeLanguage, loading: changingLanguage } = useContextProvider();
  const { i18n } = useTranslation();
  const activeCall = useCallStore(state => state.callState !== "idle");
  const isArabic = i18n.language === "ar", text = settingsText[isArabic ? "ar" : "en"];
  const setNotifications = useMutation(api.users.setNotifications);
  const [languageOpen, setLanguageOpen] = useState(false), [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState(null);
  const alive = useRef(true), updating = useRef(false), changing = useRef(false);
  const enabled = profile?.notificationsEnabled !== false;
  const syncing = profile?.notificationSyncStatus === "pending";
  const failed = profile?.notificationSyncStatus === "failed";
  const email = clerkUser?.id === profile?.clerkId ? clerkUser?.primaryEmailAddress?.emailAddress : null;
  useEffect(() => {
    alive.current = true;
    const checkPermission = () => {
      void Notifications.getPermissionsAsync().then(value => { if (alive.current) setPermission(value); }).catch(() => {});
    };
    checkPermission();
    const listener = AppState.addEventListener("change", state => { if (state === "active") checkPermission(); });
    return () => { alive.current = false; listener.remove(); };
  }, []);

  const openDeviceSettings = () => { void Linking.openSettings().catch(() => Alert.alert(text.error, text.permission)); };
  const openWebsite = () => {
    void Linking.openURL(websiteUrl).catch(() => { if (alive.current) Alert.alert(text.error, text.linkError); });
  };
  const updateNotifications = async value => {
    if (!ready || updating.current || syncing) return;
    updating.current = true; setBusy(true);
    try {
      if (value) {
        let next = await Notifications.getPermissionsAsync();
        if (!notificationPermissionAllowed(next) && next.canAskAgain !== false) next = await Notifications.requestPermissionsAsync();
        if (!alive.current) return;
        setPermission(next);
        if (!notificationPermissionAllowed(next)) {
          Alert.alert(text.notifications, text.permission, [{ text: text.cancel, style: "cancel" },
            { text: text.openSettings, onPress: openDeviceSettings }]);
          return;
        }
      }
      if (alive.current) await setNotifications({ enabled: value });
    } catch {
      if (alive.current) Alert.alert(text.error, text.saveError);
    } finally {
      updating.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const selectLanguage = async language => {
    if (changing.current || changingLanguage) return;
    if (activeCall) { Alert.alert(text.language, text.activeCall); return; }
    changing.current = true;
    try {
      await changeLanguage(language);
      if (alive.current) setLanguageOpen(false);
    } catch {
      if (alive.current) Alert.alert(text.language, text.languageError);
    } finally { changing.current = false; }
  };

  return <View style={{ direction: isArabic ? "rtl" : "ltr", gap: 12, marginTop: 28 }}>
    <View style={groupStyle}>
      <SettingsCard grouped icon="mail-outline" title={text.email} subtitle={email || text.emailUnavailable} isArabic={isArabic} selectable />
      <SettingsCard grouped divider icon="language-outline" title={text.language} subtitle={activeCall ? text.activeCall : isArabic ? "العربية" : "English"}
        isArabic={isArabic} disabled={changingLanguage || activeCall} onPress={() => setLanguageOpen(true)} />
      <SettingsCard grouped divider icon={enabled ? "notifications-outline" : "notifications-off-outline"} title={text.notifications}
        subtitle={busy || syncing ? text.saving : enabled ? text.on : text.off} isArabic={isArabic}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {(busy || syncing) && <ActivityIndicator color="#b88144" size="small" accessibilityLabel={text.saving} />}
          <Switch value={enabled} onValueChange={updateNotifications} disabled={!ready || busy || syncing}
            accessibilityLabel={text.notifications} accessibilityState={{ disabled: !ready || busy || syncing, busy: busy || syncing }}
            trackColor={{ false: "#cbd5e1", true: "#b88144" }} thumbColor="#ffffff" ios_backgroundColor="#cbd5e1" />
        </View>
      </SettingsCard>
      <SettingsCard grouped divider icon="ban-outline" title={profileText[isArabic ? "ar" : "en"].blockedUsers} isArabic={isArabic}
        onPress={() => router.push("/blocked-users")} />
    </View>
    {failed && <View style={{ alignItems: "flex-start", gap: 6 }}>
      <Text accessibilityRole="alert" style={{ color: "#b91c1c", fontSize: 13, textAlign: isArabic ? "right" : "left" }}>{text.syncError}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.retry} disabled={busy} onPress={() => updateNotifications(enabled)} style={{ padding: 10 }}>
        <Text style={{ color: "#b88144", fontWeight: "700" }}>{text.retry}</Text>
      </TouchableOpacity>
    </View>}
    {enabled && permission && !notificationPermissionAllowed(permission) && <View style={{ gap: 6 }}>
      <Text style={{ color: "#6b7280", fontSize: 13, textAlign: isArabic ? "right" : "left" }}>{text.permission}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={openDeviceSettings} style={{ padding: 10, alignSelf: "flex-start" }}>
        <Text style={{ color: "#b88144", fontWeight: "600" }}>{text.openSettings}</Text>
      </TouchableOpacity>
    </View>}
    <View style={groupStyle}>
      <SettingsCard grouped icon="shield-checkmark-outline" title={text.privacyPolicy} isArabic={isArabic}
        accessibilityRole="link" onPress={openWebsite} />
      <SettingsCard grouped divider icon="document-text-outline" title={text.termsOfService} isArabic={isArabic}
        accessibilityRole="link" onPress={openWebsite} />
      <SettingsCard grouped divider icon="information-circle-outline" title={text.aboutSaflal} isArabic={isArabic}
        accessibilityRole="link" onPress={openWebsite} />
    </View>
    {languageOpen && <Modal transparent animationType="fade" visible onRequestClose={() => { if (!changingLanguage) setLanguageOpen(false); }}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#00000066" }}>
        <View accessibilityViewIsModal style={{ direction: isArabic ? "rtl" : "ltr", backgroundColor: "white", borderRadius: 24, padding: 22, gap: 14 }}>
          {changingLanguage ? <View accessible accessibilityRole="progressbar" accessibilityLabel={text.changingLanguage}
            accessibilityState={{ busy: true }} accessibilityLiveRegion="polite"
            style={{ alignItems: "center", justifyContent: "center", minHeight: 220, gap: 18 }}>
            <ActivityIndicator size="large" color="#b88144" />
            <Text style={{ color: "#1f2937", fontSize: 18, fontWeight: "700", textAlign: "center" }}>{text.changingLanguage}</Text>
            <Text style={{ color: "#6b7280", textAlign: "center" }}>{text.languageHint}</Text>
          </View> : <>
          <Text accessibilityRole="header" style={{ color: "#1f2937", fontSize: 21, fontWeight: "700", textAlign: isArabic ? "right" : "left" }}>{text.chooseLanguage}</Text>
          <Text style={{ color: "#6b7280", textAlign: isArabic ? "right" : "left" }}>{text.languageHint}</Text>
          <SettingsCard icon="language-outline" title="English" isArabic={isArabic} disabled={changingLanguage} onPress={() => selectLanguage("en")}>
            {!isArabic && <Ionicons name="checkmark-circle" size={23} color="#b88144" />}
          </SettingsCard>
          <SettingsCard icon="language-outline" title="العربية" isArabic={isArabic} disabled={changingLanguage} onPress={() => selectLanguage("ar")}>
            {isArabic && <Ionicons name="checkmark-circle" size={23} color="#b88144" />}
          </SettingsCard>
          <TouchableOpacity accessibilityRole="button" disabled={changingLanguage} onPress={() => setLanguageOpen(false)} style={{ alignItems: "center", padding: 12 }}>
            <Text style={{ color: "#6b7280", fontWeight: "600" }}>{text.close}</Text>
          </TouchableOpacity>
          </>}
        </View>
      </View>
    </Modal>}
  </View>;
}
