import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, BackHandler, Text, TouchableOpacity, View } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { useAuthSession } from "../../context/AuthSessionContext";
import { useCallStore } from "../../store/callStore";
import ChatQueryBoundary from "../chat/ChatQueryBoundary";
import { callRoute, useAudioCalls } from "./CallProvider";
import CallHistory from "./CallHistory";
import CallContactPicker from "./CallContactPicker";
import { callError, callText } from "./callText";

export function CallListError({ message, text, onRetry }) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
    <Text style={{ color: "#6b7280", textAlign: "center" }}>{message}</Text>
    <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={{ backgroundColor: "#b88144", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 }}>
      <Text style={{ color: "white", fontWeight: "600" }}>{text.retry}</Text>
    </TouchableOpacity>
  </View>;
}

export function CallsHome({ text, language, isArabic }) {
  const router = useRouter(), insets = useSafeAreaInsets();
  const audio = useAudioCalls();
  const activeCallId = useCallStore(state => state.callId);
  const createChat = useMutation(api.chats.getOrCreateDirectChat);
  const sheet = useRef(null), pending = useRef(false), alive = useRef(true), focused = useRef(true);
  const [busy, setBusy] = useState(false), [pickerOpen, setPickerOpen] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0), [contactsRevision, setContactsRevision] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [selectionActive, setSelectionActive] = useState(() => false);
  const disabled = busy || !!audio?.starting || !!selectionActive;

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    // Re-group at local midnight, as well as after a background/timezone change.
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      const time = Date.now(), midnight = new Date(time);
      midnight.setHours(24, 0, 0, 0);
      setNow(time);
      timer = setTimeout(refresh, Math.max(1000, midnight.getTime() - time));
    };
    refresh();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    const modal = sheet.current;
    return () => { focused.current = false; modal?.dismiss(); };
  }, []));
  useEffect(() => {
    if (!pickerOpen) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { sheet.current?.dismiss(); return true; });
    return () => subscription.remove();
  }, [pickerOpen]);

  const closePicker = () => { sheet.current?.dismiss(); setPickerOpen(false); };
  const returnToCall = () => {
    const id = useCallStore.getState().callId;
    if (!id) return;
    closePicker(); router.push(callRoute(id));
  };
  const onCall = async ({ chatId, userId }) => {
    if (selectionActive) return;
    if (pending.current || audio?.starting) return;
    if (useCallStore.getState().callId) { returnToCall(); return; }
    if (!audio) { Alert.alert(text.history, text.setup); return; }
    pending.current = true; setBusy(true);
    try {
      const id = chatId || (await createChat({ userId })).chatId;
      if (!alive.current || !focused.current) return;
      if (useCallStore.getState().callId) { returnToCall(); return; }
      closePicker();
      await audio.startCall(id);
    } catch (error) {
      if (alive.current) Alert.alert(text.history, callError(error, text));
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return <View style={{ flex: 1, backgroundColor: "#f9fafb", direction: isArabic ? "rtl" : "ltr" }}>
    {activeCallId && <TouchableOpacity accessibilityRole="button" onPress={returnToCall}
      style={{ padding: 14, backgroundColor: "#166534", alignItems: "center" }}>
      <Text style={{ color: "white", fontWeight: "700" }}>{text.open}</Text>
    </TouchableOpacity>}
    <ChatQueryBoundary key={historyRevision} fallback={<CallListError message={text.historyError} text={text} onRetry={() => setHistoryRevision(n => n + 1)} />}>
      <CallHistory text={text} language={language} isArabic={isArabic} now={now} bottomInset={insets.bottom} disabled={disabled} onCall={onCall} onSelectionChange={setSelectionActive} />
    </ChatQueryBoundary>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={activeCallId ? text.open : text.newCall}
      accessibilityState={{ disabled, busy: disabled }} disabled={disabled}
      onPress={() => {
        if (useCallStore.getState().callId) { returnToCall(); return; }
        setPickerOpen(true); sheet.current?.present();
      }}
      style={{ position: "absolute", bottom: insets.bottom + 20, end: 20,
        flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "#b88144", borderRadius: 30,
        paddingHorizontal: 22, height: 56, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15,
        shadowRadius: 5, opacity: disabled ? 0.6 : 1 }}>
      {disabled ? <ActivityIndicator color="white" /> : <Ionicons name="call-outline" size={22} color="white" />}
      <Text style={{ fontWeight: "700", fontSize: 15, color: "white" }}>{activeCallId ? text.open : text.newCall}</Text>
    </TouchableOpacity>
    <BottomSheetModal ref={sheet} snapPoints={["65%", "90%"]} enableDynamicSizing={false} enablePanDownToClose
      topInset={insets.top} onDismiss={() => setPickerOpen(false)}
      backdropComponent={props => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />}>
      <View style={{ direction: isArabic ? "rtl" : "ltr", flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 20, fontWeight: "700", color: "#1f2937", textAlign: isArabic ? "right" : "left" }}>{text.chooseContact}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.close} onPress={closePicker} style={{ padding: 12 }}>
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>
      {pickerOpen && <ChatQueryBoundary key={contactsRevision} fallback={<CallListError message={text.contactsError} text={text} onRetry={() => setContactsRevision(n => n + 1)} />}>
        <CallContactPicker text={text} isArabic={isArabic} bottomInset={insets.bottom} disabled={disabled} onCall={onCall}
          onContacts={() => { closePicker(); router.push("/(tabs)/contact"); }} />
      </ChatQueryBoundary>}
    </BottomSheetModal>
  </View>;
}

export default function CallsScreen() {
  const { ready, profile } = useAuthSession();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const language = isArabic ? "ar" : "en";
  const text = callText[language];
  if (!ready) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" }}>
    <ActivityIndicator color="#b88144" size="large" accessibilityLabel={text.loadingHistory} />
  </View>;
  return <CallsHome key={profile._id} text={text} language={language} isArabic={isArabic} />;
}
