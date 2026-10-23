import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { searchInput } from "../../convex/lib/searchPolicy";
import { useAuthSession } from "../../context/AuthSessionContext";
import { messageRoute } from "../../lib/messageNavigation";
import FetchChats from "../FetchChats";
import ConvexUserItem from "../users/ConvexUserItem";
import { contactText } from "../users/contactText";
import ChatQueryBoundary from "../chat/ChatQueryBoundary";
import { searchText } from "./searchText";
import { displayName } from "../../shared/displayName";

const PAGE_SIZE = 20, color = "#b88144";
const center = { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 };

function mergeNameSearches(...streams) {
  const unique = new Map();
  for (const stream of streams) {
    if (stream.status === "LoadingFirstPage") continue;
    for (const item of stream.results) {
      const id = item.chatId ?? item._id;
      if (!unique.has(id)) unique.set(id, item);
    }
  }
  return {
    results: [...unique.values()],
    status: ["LoadingFirstPage", "LoadingMore", "CanLoadMore"].find(status => streams.some(stream => stream.status === status)) ?? "Exhausted",
    loadMore: count => { for (const stream of streams) if (stream.status === "CanLoadMore") stream.loadMore(count); },
  };
}

export function SearchResults({ query, tab, text, userText, onRefresh, navigationActiveRef }) {
  const { profile } = useAuthSession();
  const router = useRouter(), opening = useRef(false);
  const insets = useSafeAreaInsets();
  const fullNameChats = usePaginatedQuery(api.search.chats, tab === "people" ? "skip" : { query }, { initialNumItems: PAGE_SIZE });
  const fullNamePeople = usePaginatedQuery(api.search.people, tab === "chats" ? "skip" : { query }, { initialNumItems: PAGE_SIZE });
  const nicknameChats = usePaginatedQuery(api.search.chats, tab === "people" ? "skip" : { query, field: "nickName" }, { initialNumItems: PAGE_SIZE });
  const nicknamePeople = usePaginatedQuery(api.search.people, tab === "chats" ? "skip" : { query, field: "nickName" }, { initialNumItems: PAGE_SIZE });
  const chats = mergeNameSearches(fullNameChats, nicknameChats);
  const people = mergeNameSearches(fullNamePeople, nicknamePeople);
  const sections = [
    ...(tab !== "people" ? [{ kind: "chats", stream: chats }] : []),
    ...(tab !== "chats" ? [{ kind: "people", stream: people }] : []),
  ];
  const data = sections.flatMap(({ kind, stream }) => [
    { key: kind, kind: "heading", title: text[kind] },
    ...stream.results.map(item => ({ key: `${kind}:${item.chatId ?? item._id}`, kind, item })),
    { key: `${kind}:status`, kind: "status", stream, title: text[kind] },
  ]);
  const loadNext = () => { for (const { stream } of sections) if (stream.status === "CanLoadMore") stream.loadMore(PAGE_SIZE); };
  const openChat = chatId => {
    if (opening.current || !navigationActiveRef.current) return;
    opening.current = true;
    navigationActiveRef.current = false;
    router.push(messageRoute(chatId));
  };
  useFocusEffect(useCallback(() => { opening.current = false; }, []));
  return <FlatList
    data={data} keyExtractor={row => row.key}
    keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}
    contentContainerStyle={{ paddingBottom: insets.bottom + 20, flexGrow: 1 }}
    onEndReached={loadNext} onEndReachedThreshold={0.5}
    refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} colors={[color]} tintColor={color} accessibilityLabel={text.refresh} />}
    renderItem={({ item: row }) => {
      if (row.kind === "heading") return <Text accessibilityRole="header" style={{ padding: 14, fontSize: 13, fontWeight: "700", color: "#6b7280" }}>{row.title}</Text>;
      if (row.kind === "status") {
        const { stream } = row;
        if (stream.status === "LoadingFirstPage" || stream.status === "LoadingMore") return <ActivityIndicator style={{ margin: 20 }} color={color} accessibilityLabel={`${text.searching} ${row.title}`} />;
        if (stream.status === "CanLoadMore") return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${text.more}: ${row.title}`} onPress={() => stream.loadMore(PAGE_SIZE)} style={{ padding: 18, alignItems: "center" }}>
          <Text style={{ color, fontWeight: "600" }}>{text.more}</Text>
        </TouchableOpacity>;
        return !stream.results.length ? <Text style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>{text.empty}</Text> : null;
      }
      const { item } = row;
      if (row.kind === "people") return <ConvexUserItem item={item} text={userText} navigationActiveRef={navigationActiveRef} />;
      return <FetchChats showPresence={false} currentUserId={profile._id} onOpen={() => openChat(item.chatId)} item={{
        _id: item.chatId, lastMessageAt: item.lastMessageAt, lastMessage: item.lastMessage,
        unreadCount: item.unreadCount ?? 0,
        participants: { _id: item.peer?._id, FullName: displayName(item.peer, text.unavailable), avatar: item.peer?.imageUrl },
      }} />;
    }}
  />;
}

export function SearchHome({ text, userText, isArabic }) {
  const router = useRouter(), insets = useSafeAreaInsets();
  const [value, setValue] = useState(""), [settled, setSettled] = useState("");
  const [tab, setTab] = useState("all"), [revision, setRevision] = useState(0);
  const navigationActiveRef = useRef(true);
  const input = searchInput(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(input.query), 300);
    return () => clearTimeout(timer);
  }, [input.query]);
  useFocusEffect(useCallback(() => {
    navigationActiveRef.current = true;
    return () => { navigationActiveRef.current = false; };
  }, []));
  const refresh = () => setRevision(n => n + 1);
  const rtl = { flexDirection: isArabic ? "row-reverse" : "row" };
  return <View style={{ flex: 1, backgroundColor: "#f9fafb", paddingTop: insets.top }}>
    <View style={[{ alignItems: "center", backgroundColor: "white", padding: 12, gap: 10 }, rtl]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.back} onPress={() => router.back()} hitSlop={10} style={{ padding: 8 }}>
        <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={22} color="#374151" />
      </TouchableOpacity>
      <View style={[{ flex: 1, alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: 22, paddingHorizontal: 12, minHeight: 44, gap: 8 }, rtl]}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" />
        <TextInput accessibilityLabel={text.placeholder} placeholder={text.placeholder} placeholderTextColor="#9ca3af" value={value} onChangeText={setValue}
          autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} maxLength={80}
          style={{ flex: 1, color: "#111827", fontSize: 15, textAlign: isArabic ? "right" : "left", paddingVertical: 8 }} />
        {!!value && <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.clear} onPress={() => setValue("")} hitSlop={10}>
          <Ionicons name="close" size={20} color="#6b7280" />
        </TouchableOpacity>}
      </View>
    </View>
    <View accessibilityRole="tablist" style={[{ gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "white" }, rtl]}>
      {["all", "chats", "people"].map(kind => <TouchableOpacity key={kind} accessibilityRole="tab" accessibilityState={{ selected: kind === tab }}
        accessibilityLabel={text[kind]} onPress={() => setTab(kind)} style={{ borderRadius: 18, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: kind === tab ? color : "#f3f4f6" }}>
        <Text style={{ color: kind === tab ? "white" : "#4b5563", fontWeight: "600" }}>{text[kind]}</Text>
      </TouchableOpacity>)}
    </View>
    {!input.query ? <View style={center}>
      <Ionicons name="search-outline" size={44} color="#9ca3af" />
      <Text style={{ fontSize: 17, fontWeight: "700", color: "#374151", marginVertical: 12 }}>{text.title}</Text>
      <Text style={{ color: "#6b7280", textAlign: "center" }}>{text.guidance}</Text>
    </View> : !input.valid ? <View style={center}><Text accessibilityRole="alert" style={{ color: "#6b7280", textAlign: "center" }}>{text.invalid}</Text></View>
      : input.query !== settled ? <View style={center}><ActivityIndicator color={color} accessibilityLabel={text.searching} /></View>
        : <ChatQueryBoundary key={`${settled}:${tab}:${revision}`} fallback={<View style={center}>
          <Text accessibilityRole="alert" style={{ color: "#6b7280", textAlign: "center", marginBottom: 16 }}>{text.error}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.retry} onPress={refresh} style={{ backgroundColor: color, borderRadius: 22, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: "white", fontWeight: "600" }}>{text.retry}</Text>
          </TouchableOpacity>
        </View>}>
          <SearchResults query={settled} tab={tab} text={text} userText={userText} onRefresh={refresh} navigationActiveRef={navigationActiveRef} />
        </ChatQueryBoundary>}
  </View>;
}

export default function SearchScreen() {
  const { ready, profile } = useAuthSession(), { i18n } = useTranslation();
  const language = i18n.language === "ar" ? "ar" : "en";
  if (!ready) return <View style={center}><ActivityIndicator color={color} accessibilityLabel={searchText[language].searching} /></View>;
  return <SearchHome key={profile._id} text={searchText[language]} userText={contactText[language]} isArabic={language === "ar"} />;
}
