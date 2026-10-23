import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { useAction } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { useAuthSession } from "../../context/AuthSessionContext";
import { useCallStore } from "../../store/callStore";
import SettingsCard, { settingsGroupStyle } from "./SettingsCard";
import { settingsText } from "./settingsText";

export default function SettingsAccountActions() {
  const { ready, logout } = useAuthSession();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar", text = settingsText[isArabic ? "ar" : "en"];
  const activeCall = useCallStore(state => state.callState !== "idle");
  const requestDeletion = useAction(api.accountDeletionActions.request);
  const [busy, setBusy] = useState(null);
  const pending = useRef(false), confirming = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const perform = async kind => {
    if (!alive.current || !ready || pending.current) return;
    confirming.current = false; pending.current = true; setBusy(kind);
    let accepted = false;
    try {
      if (kind === "delete") {
        await requestDeletion({ confirmation: "DELETE" });
        accepted = true;
      }
      // Deletion also triggers session-level sign-out on every connected device.
      if (alive.current) await logout();
    } catch (error) {
      if (alive.current) Alert.alert(text.error, accepted || kind === "logout" ? text.logoutError :
        error?.data === "ACCOUNT_DELETE_ACTIVE_CALL" ? text.deleteActiveCall :
          error?.data === "ACCOUNT_DELETE_UNAVAILABLE" ? text.deleteUnavailable : text.deleteError);
    } finally {
      pending.current = false;
      if (alive.current) setBusy(null);
    }
  };
  const confirm = kind => {
    if (!ready || pending.current || confirming.current) return;
    if (kind === "delete" && activeCall) { Alert.alert(text.deleteAccount, text.deleteActiveCall); return; }
    confirming.current = true;
    const close = () => { confirming.current = false; };
    Alert.alert(kind === "delete" ? text.deleteAccount : text.logout,
      kind === "delete" ? text.deleteConfirm : text.logoutConfirm, [
        { text: text.cancel, style: "cancel", onPress: close },
        { text: kind === "delete" ? text.deleteAccount : text.logout, style: "destructive", onPress: () => perform(kind) },
      ], { cancelable: true, onDismiss: close });
  };

  return <View style={[settingsGroupStyle, { marginTop: 24 }]}>
    <SettingsCard grouped destructive icon="log-out-outline" title={text.logout} isArabic={isArabic}
      disabled={!ready || !!busy} onPress={() => confirm("logout")}>
      {busy === "logout" && <ActivityIndicator color="#ef4444" accessibilityLabel={text.loggingOut} />}
    </SettingsCard>
    <SettingsCard grouped divider destructive icon="trash-outline" title={text.deleteAccount} isArabic={isArabic}
      disabled={!ready || !!busy} onPress={() => confirm("delete")}>
      {busy === "delete" && <ActivityIndicator color="#ef4444" accessibilityLabel={text.deleting} />}
    </SettingsCard>
  </View>;
}
