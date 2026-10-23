import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import ActionModal from "../CustomHookUi/ActionModel";
import ChatQueryBoundary from "../chat/ChatQueryBoundary";
import ProfileAvatar from "./ProfileAvatar";
import { profileText } from "./profileText";
import { displayName } from "../../shared/displayName";

export function ProfileDialog({ target, onClose, language, unblockOnly = false }) {
  const text = profileText[language], isArabic = language === "ar";
  const status = useQuery(api.blockedUsers.getBlockingStatus, { blockedId: target.userId });
  const profile = useQuery(api.profiles.get, unblockOnly ? "skip" : { userId: target.userId, ...(target.chatId ? { chatId: target.chatId } : {}) });
  const block = useMutation(api.blockedUsers.blockUser), unblock = useMutation(api.blockedUsers.unblockUser);
  const [confirmation, setConfirmation] = useState(() => unblockOnly ? { unblock: true } : null);
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const submitting = useRef(false), active = useRef(true);
  const router = useRouter(), { height } = useWindowDimensions(), insets = useSafeAreaInsets();
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useFocusEffect(useCallback(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []));
  const blocked = status?.isBlockedByMe === true;
  const canAct = status !== undefined && (blocked || (!unblockOnly && profile != null));
  const close = () => {
    if (submitting.current) return;
    if (confirmation && !unblockOnly) { setConfirmation(null); setError(""); }
    else onClose();
  };
  const act = async () => {
    if (submitting.current || !active.current || !canAct) return;
    if (!confirmation) { if (canAct) setConfirmation({ unblock: blocked }); return; }
    submitting.current = true; setPending(true); setError("");
    try {
      await (confirmation.unblock ? unblock : block)({ blockedId: target.userId });
      if (!active.current) return;
      if (unblockOnly) onClose(); else setConfirmation(null);
    } catch {
      if (active.current) setError(text.saveError);
    } finally {
      submitting.current = false;
      if (active.current) setPending(false);
    }
  };
  const viewImage = () => {
    if (!profile?.imageUrl || submitting.current || !active.current) return;
    onClose(); router.push({ pathname: "/imageView", params: { url: profile.imageUrl } });
  };
  const isUnblock = confirmation ? confirmation.unblock : blocked;
  const field = (label, value) => <View key={label} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
    <Text style={{ color: "#64748b", fontSize: 12, marginBottom: 5, textAlign: isArabic ? "right" : "left" }}>{label}</Text>
    <Text selectable style={{ color: "#1f2937", fontSize: 15, textAlign: isArabic ? "right" : "left" }}>{value}</Text>
  </View>;
  return <ActionModal visible title={confirmation ? isUnblock ? text.unblockTitle : text.blockTitle : text.profile}
    description={unblockOnly && status?.isBlockedByMe === false ? text.notBlocked : confirmation ? isUnblock ? text.unblockBody : text.blockBody : undefined}
    cancelLabel={confirmation ? text.cancel : text.close} actionLabel={pending ? text.saving : isUnblock ? text.unblock : text.block}
    onClose={close} onHandleFn={act} closeOnConfirm={false} isLoading={pending} error={error}
    actionDisabled={!canAct} isDangerous={!isUnblock} isArabic={isArabic}>
    {!confirmation && <ScrollView style={{ maxHeight: Math.max(120, (height - insets.top - insets.bottom) * 0.48), marginBottom: 18 }} contentContainerStyle={{ paddingBottom: 6 }}>
      {profile === undefined || status === undefined ? <ActivityIndicator color="#b88144" accessibilityLabel={text.loading} />
        : !profile ? <Text style={{ color: "#64748b", textAlign: "center" }}>{text.unavailable}</Text> : <>
          <View style={{ alignItems: "center", gap: 12, paddingBottom: 10 }}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.viewImage} disabled={!profile.imageUrl} onPress={viewImage}>
              <ProfileAvatar user={profile} size={96} />
            </TouchableOpacity>
            <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 23, textAlign: "center" }}>{displayName(profile)}</Text>
          </View>
          {field(text.email, profile.email || text.noEmail)}
          {field(text.bio, profile.bio || text.noBio)}
          {field(text.joined, profile.createdAt === undefined ? text.noDate : new Date(profile.createdAt).toLocaleDateString(language, { year: "numeric", month: "long", day: "numeric" }))}
        </>}
    </ScrollView>}
  </ActionModal>;
}

export default function UserProfileModal(props) {
  const [revision, setRevision] = useState(0);
  const text = profileText[props.language];
  return <ChatQueryBoundary key={revision} fallback={<ActionModal visible title={text.profile} description={text.error}
    cancelLabel={text.close} actionLabel={text.retry} closeOnConfirm={false} onClose={props.onClose}
    onHandleFn={() => setRevision(n => n + 1)} isArabic={props.language === "ar"} />}>
    <ProfileDialog {...props} />
  </ChatQueryBoundary>;
}
