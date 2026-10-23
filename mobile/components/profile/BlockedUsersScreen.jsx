import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthSession } from "../../context/AuthSessionContext";
import ChatQueryBoundary from "../chat/ChatQueryBoundary";
import ProfileAvatar from "./ProfileAvatar";
import UserProfileModal from "./UserProfileModal";
import { profileText } from "./profileText";
import { displayName } from "../../shared/displayName";

const color = "#b88144", PAGE_SIZE = 20;
export function BlockedUsersList({ text, language, onRefresh, onUnblock }) {
  const { results, status, loadMore } = usePaginatedQuery(api.blockedUsers.getBlockedUsers, {}, { initialNumItems: PAGE_SIZE });
  const insets = useSafeAreaInsets();
  const loadNext = () => { if (status === "CanLoadMore") loadMore(PAGE_SIZE); };
  if (status === "LoadingFirstPage") return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={color} accessibilityLabel={text.loading} /></View>;
  return <FlatList data={results} keyExtractor={item => item._id} onEndReached={() => { if (results.length) loadNext(); }} onEndReachedThreshold={0.5}
    contentContainerStyle={{ paddingBottom: insets.bottom + 20, flexGrow: 1 }}
    refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} colors={[color]} tintColor={color} accessibilityLabel={text.refresh} />}
    renderItem={({ item }) => <View style={{ flexDirection: language === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
      <ProfileAvatar user={item.user ? { ...item.user, _id: item.blockedId } : null} />
      <Text numberOfLines={2} style={{ flex: 1, fontWeight: "700", color: "#1f2937", textAlign: language === "ar" ? "right" : "left" }}>{displayName(item.user, text.user)}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${text.unblock}: ${displayName(item.user, text.user)}`}
        onPress={() => onUnblock({ userId: item.blockedId })} style={{ padding: 12, borderRadius: 18, backgroundColor: "#b8814414" }}>
        <Text style={{ color, fontWeight: "700" }}>{text.unblock}</Text>
      </TouchableOpacity>
    </View>}
    ListEmptyComponent={status === "Exhausted" ? <Text style={{ padding: 28, textAlign: "center", color: "#64748b" }}>{text.empty}</Text> : null}
    ListFooterComponent={status === "LoadingMore" ? <ActivityIndicator color={color} accessibilityLabel={text.loading} style={{ margin: 20 }} />
      : status === "CanLoadMore" ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.more} onPress={loadNext} style={{ padding: 20, alignItems: "center" }}>
        <Text style={{ color, fontWeight: "600" }}>{text.more}</Text>
      </TouchableOpacity> : null}
  />;
}

export function BlockedUsersHome({ text, language }) {
  const router = useRouter(), insets = useSafeAreaInsets();
  const [revision, setRevision] = useState(0), [target, setTarget] = useState(null);
  useFocusEffect(useCallback(() => () => setTarget(null), []));
  const refresh = () => setRevision(n => n + 1);
  return <View style={{ flex: 1, backgroundColor: "#f9fafb", paddingTop: insets.top }}>
    <View style={{ flexDirection: language === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 16, padding: 16, backgroundColor: "white" }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.close} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name={language === "ar" ? "arrow-forward" : "arrow-back"} size={24} color="#374151" />
      </TouchableOpacity>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "700", color: "#1f2937", flex: 1 }}>{text.blockedUsers}</Text>
    </View>
    <ChatQueryBoundary key={revision} fallback={<View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 }}>
      <Text accessibilityRole="alert" style={{ color: "#64748b", textAlign: "center" }}>{text.listError}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={refresh} style={{ padding: 14 }}><Text style={{ color, fontWeight: "700" }}>{text.retry}</Text></TouchableOpacity>
    </View>}>
      <BlockedUsersList text={text} language={language} onRefresh={refresh} onUnblock={value => setTarget(current => current ?? value)} />
    </ChatQueryBoundary>
    {target && <UserProfileModal key={target.userId} target={target} language={language} unblockOnly onClose={() => setTarget(null)} />}
  </View>;
}

export default function BlockedUsersScreen() {
  const { ready, profile } = useAuthSession(), { i18n } = useTranslation();
  const language = i18n.language === "ar" ? "ar" : "en", text = profileText[language];
  if (!ready) return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={color} accessibilityLabel={text.loading} /></View>;
  return <BlockedUsersHome key={profile._id} text={text} language={language} />;
}
