import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { useAuthSession } from "../../context/AuthSessionContext";
import { api } from "../../convex/_generated/api";
import { BIO_LIMIT, NICKNAME_LIMIT } from "../../shared/displayName";
import SettingsCard, { settingsGroupStyle } from "./SettingsCard";
import { settingsText } from "./settingsText";

export default function SettingsProfileEditor() {
  const { ready, profile } = useAuthSession(), { i18n } = useTranslation();
  const isArabic = i18n.language === "ar", text = settingsText[isArabic ? "ar" : "en"];
  const insets = useSafeAreaInsets(), update = useMutation(api.users.updateProfile);
  const [open, setOpen] = useState(false), [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ nickName: "", bio: "" }), [error, setError] = useState("");
  const alive = useRef(true), submitting = useRef(false);
  useEffect(() => () => { alive.current = false; }, []);
  useFocusEffect(useCallback(() => {
    alive.current = true;
    return () => { alive.current = false; setOpen(false); };
  }, []));
  const edit = () => {
    if (!ready || !profile || submitting.current) return;
    setDraft({ nickName: profile.nickName || "", bio: profile.bio || "" }); setSaving(false); setError(""); setOpen(true);
  };
  const close = () => { if (!submitting.current) setOpen(false); };
  const invalidName = [...draft.nickName.trim()].length > NICKNAME_LIMIT || /[\u0000-\u001f\u007f]/u.test(draft.nickName.trim());
  const invalidBio = [...draft.bio].length > BIO_LIMIT;
  const changed = draft.nickName.trim() !== (profile?.nickName || "") || draft.bio.trim() !== (profile?.bio || "");
  const canSave = ready && !!profile && changed && !invalidName && !invalidBio;
  const save = async () => {
    if (!canSave || submitting.current || !alive.current) return;
    submitting.current = true; setSaving(true); setError("");
    try {
      // Identity comes from Clerk on the server; never send a user ID.
      await update({ nickName: draft.nickName, bio: draft.bio });
      if (alive.current) setOpen(false);
    } catch {
      if (alive.current) setError(text.profileSaveError);
    } finally {
      submitting.current = false;
      if (alive.current) setSaving(false);
    }
  };
  /** @type {import("react-native").TextStyle} */
  const align = { textAlign: isArabic ? "right" : "left", writingDirection: isArabic ? "rtl" : "ltr" };
  /** @type {import("react-native").TextStyle} */
  const fieldStyle = { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14, padding: 14, color: "#1f2937", fontSize: 16, ...align };

  return <View style={{ marginTop: 24 }}>
    <View style={settingsGroupStyle}>
      <SettingsCard grouped icon="person-outline" title={text.nickName} subtitle={profile?.nickName || text.noNickName}
        isArabic={isArabic} disabled={!ready} onPress={edit} />
      <SettingsCard grouped divider icon="create-outline" title={text.bio} subtitle={profile?.bio || text.noBio}
        isArabic={isArabic} disabled={!ready} onPress={edit} />
    </View>
    {open && <Modal transparent visible animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#00000080", paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
        <View accessibilityViewIsModal style={{ direction: isArabic ? "rtl" : "ltr", width: "100%", maxWidth: 440, maxHeight: "100%", backgroundColor: "white", borderRadius: 26, overflow: "hidden" }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 12 }}>
            <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "700", color: "#1f2937", ...align }}>{text.editProfile}</Text>
            <Text style={{ color: "#64748b", fontSize: 13, marginBottom: 8, ...align }}>{text.nickNameHint}</Text>
            <Text style={{ color: "#334155", fontWeight: "600", ...align }}>{text.nickName}</Text>
            <TextInput accessibilityLabel={text.nickName} value={draft.nickName} editable={!saving} maxLength={NICKNAME_LIMIT * 2}
              autoCapitalize="words" autoCorrect={false} style={fieldStyle} onChangeText={nickName => setDraft(value => ({ ...value, nickName }))} />
            <Text style={{ color: invalidName ? "#dc2626" : "#64748b", fontSize: 12, ...align }}>{[...draft.nickName.trim()].length}/{NICKNAME_LIMIT}</Text>
            <Text style={{ color: "#334155", fontWeight: "600", ...align }}>{text.bio}</Text>
            <TextInput accessibilityLabel={text.bio} value={draft.bio} editable={!saving} multiline maxLength={BIO_LIMIT * 2}
              textAlignVertical="top" style={{ ...fieldStyle, minHeight: 112 }} onChangeText={bio => setDraft(value => ({ ...value, bio }))} />
            <Text style={{ color: invalidBio ? "#dc2626" : "#64748b", fontSize: 12, ...align }}>{[...draft.bio].length}/{BIO_LIMIT}</Text>
            {(invalidName || invalidBio) && <Text accessibilityRole="alert" style={{ color: "#dc2626", ...align }}>{text.profileInvalid}</Text>}
            {!!error && <Text accessibilityRole="alert" style={{ color: "#dc2626", ...align }}>{error}</Text>}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.cancel} disabled={saving} onPress={close}
                style={{ flex: 1, alignItems: "center", padding: 16, backgroundColor: "#f1f5f9", borderRadius: 14 }}>
                <Text style={{ color: "#475569", fontWeight: "700" }}>{text.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.saveProfile} disabled={!canSave || saving} onPress={save}
                accessibilityState={{ disabled: !canSave || saving, busy: saving }}
                style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, padding: 16, backgroundColor: "#b88144", borderRadius: 14, opacity: !canSave || saving ? 0.5 : 1 }}>
                {saving && <ActivityIndicator color="white" />}
                <Text style={{ color: "white", fontWeight: "700" }}>{saving ? text.savingProfile : text.saveProfile}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>}
  </View>;
}
