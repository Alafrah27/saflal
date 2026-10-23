import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { usePaginatedQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import CallAvatar from "./CallAvatar";
import { callDayKey, callDescription, groupCallsByDay, mergeCallHistory } from "./callHistoryModel";
import useListDeletion from "../../hooks/useListDeletion";
import ListDeletionControls from "../CustomHookUi/ListDeletionControls";
import { displayName } from "../../shared/displayName";

const PAGE_SIZE = 20;

export function CallHistoryRow({ call, text, language, isArabic, disabled, onCall, deletion }) {
  const name = displayName(call.peer, text.unavailableUser);
  const description = callDescription(call, text);
  const color = description.missed ? "#dc2626" : "#6b7280";
  const time = new Date(call.createdAt).toLocaleTimeString(language, { hour: "numeric", minute: "2-digit" });
  const live = ["ringing", "accepted"].includes(call.status);
  const selected = deletion?.selected.has(call._id) ?? false;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${deletion?.text.select ?? ""}: ${name}`}
    accessibilityHint={live ? deletion?.text.activeCall : deletion?.text.selectHint}
    accessibilityState={{ selected, disabled: !!deletion?.pending || (!!deletion?.active && live) }}
    disabled={!!deletion?.pending || (!!deletion?.active && live)} activeOpacity={0.8} delayLongPress={400}
    onLongPress={!live && (!disabled || deletion?.active) ? () => deletion?.toggle(call._id) : undefined}
    onPress={() => { if (deletion?.active && !live) deletion.toggle(call._id); }}
    style={{ direction: isArabic ? "rtl" : "ltr", flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: selected ? "#b8814414" : "white", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
    {deletion?.active && <Ionicons name={selected ? "checkbox" : "square-outline"} size={24} color={live ? "#d1d5db" : "#b88144"} />}
    <CallAvatar peer={call.peer} name={name} />
    <View style={{ flex: 1, gap: 5, alignItems: "flex-start" }}>
      <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "700", color: description.missed ? "#dc2626" : "#1f2937", textAlign: isArabic ? "right" : "left" }}>{name}</Text>
      <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
        <Ionicons name={call.direction === "incoming" ? "arrow-down-left-box-outline" : "arrow-up-right-box-outline"} size={15} color={color} />
        <Text style={{ color, fontSize: 12, flexShrink: 1, textAlign: isArabic ? "right" : "left", writingDirection: isArabic ? "rtl" : "ltr" }}>{description.label}</Text>
      </View>
      <Text style={{ fontSize: 12, color: "#9ca3af" }}>{time}</Text>
    </View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${text.callBack}: ${name}`}
      accessibilityState={{ disabled: disabled || !!deletion?.active || !!deletion?.pending || !call.peer || !call.chatId }}
      disabled={disabled || !!deletion?.active || !!deletion?.pending || !call.peer || !call.chatId}
      onPress={event => { event?.stopPropagation?.(); if (!deletion?.active && !deletion?.pending) onCall({ chatId: call.chatId }); }}
      style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
        backgroundColor: "#b8814414", opacity: disabled || !call.peer || !call.chatId ? 0.4 : 1 }}>
      <Ionicons name="call-outline" size={22} color="#b88144" />
    </TouchableOpacity>
  </TouchableOpacity>;
}

export default function CallHistory(props) {
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshPending = useRef(false);
  const deletion = useListDeletion("call");
  const { onSelectionChange } = props;
  useEffect(() => {
    onSelectionChange?.(deletion.active || deletion.pending);
    return () => onSelectionChange?.(false);
  }, [deletion.active, deletion.pending, onSelectionChange]);
  const onRefresh = () => {
    if (refreshPending.current || deletion.pending) return;
    if (deletion.active) deletion.cancel();
    refreshPending.current = true;
    setRefreshing(true);
    // Reset both directional cursors together; Convex supplies current reactive data.
    setRevision(value => value + 1);
  };
  const onRefreshComplete = useCallback(() => {
    if (!refreshPending.current) return;
    refreshPending.current = false;
    setRefreshing(false);
  }, []);
  return <CallHistoryPages key={revision} {...props} deletion={deletion} refreshing={refreshing} onRefresh={onRefresh} onRefreshComplete={onRefreshComplete} />;
}

function CallHistoryPages({ text, language, isArabic, now, bottomInset, disabled, onCall, refreshing, onRefresh, onRefreshComplete, deletion }) {
  const incoming = usePaginatedQuery(api.calls.history, { direction: "incoming" }, { initialNumItems: PAGE_SIZE });
  const outgoing = usePaginatedQuery(api.calls.history, { direction: "outgoing" }, { initialNumItems: PAGE_SIZE });
  const merged = mergeCallHistory(incoming, outgoing);
  const loadingFirstPage = incoming.status === "LoadingFirstPage" || outgoing.status === "LoadingFirstPage";
  const loadingPage = useRef(false);
  useEffect(() => {
    if (!loadingFirstPage) onRefreshComplete();
  }, [loadingFirstPage, onRefreshComplete]);
  useEffect(() => {
    if (!merged.loading) loadingPage.current = false;
  }, [merged.loading, incoming.results, outgoing.results]);
  const loadNext = () => {
    if (refreshing || merged.loading || loadingPage.current || !merged.next.length) return;
    loadingPage.current = true;
    for (const direction of merged.next) (direction === "incoming" ? incoming : outgoing).loadMore(PAGE_SIZE);
  };
  const dayTitles = new Map();
  for (const group of groupCallsByDay(merged.calls, now, language, text)) dayTitles.set(group.key, group.title);
  if (loadingFirstPage && !refreshing) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <ActivityIndicator size="large" color="#b88144" accessibilityLabel={text.loadingHistory} />
  </View>;
  return <View style={{ flex: 1 }}><ListDeletionControls deletion={deletion} />
    <FlatList data={merged.calls} keyExtractor={item => item._id}
    showsVerticalScrollIndicator={false} initialNumToRender={PAGE_SIZE}
    alwaysBounceVertical
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#b88144"]} tintColor="#b88144" />}
    contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomInset + 100 }}
    renderItem={({ item, index }) => {
      const day = callDayKey(item.createdAt);
      const startsDay = index === 0 || day !== callDayKey(merged.calls[index - 1].createdAt);
      return <View>
        {startsDay && <Text accessibilityRole="header" style={{ paddingHorizontal: 18, paddingTop: 20,
          paddingBottom: 9, fontSize: 13, fontWeight: "700", color: "#6b7280", textAlign: isArabic ? "right" : "left" }}>{dayTitles.get(day)}</Text>}
        <CallHistoryRow call={item} text={text} language={language} isArabic={isArabic} disabled={disabled} onCall={onCall} deletion={deletion} />
      </View>;
    }}
    onEndReached={() => { if (merged.calls.length) loadNext(); }} onEndReachedThreshold={0.4}
    ListEmptyComponent={merged.exhausted ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#b8814414", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <Ionicons name="call-outline" size={36} color="#b88144" />
      </View>
      <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 8 }}>{text.empty}</Text>
      <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center" }}>{text.emptyHint}</Text>
    </View> : null}
    ListFooterComponent={refreshing ? null : merged.loading ? <ActivityIndicator color="#b88144" accessibilityLabel={text.loadingHistory} style={{ padding: 20 }} />
      : merged.next.length ? <TouchableOpacity accessibilityRole="button" onPress={loadNext} style={{ alignItems: "center", padding: 20 }}>
        <Text style={{ fontWeight: "600", color: "#b88144" }}>{text.more}</Text>
      </TouchableOpacity> : null} /></View>;
}
