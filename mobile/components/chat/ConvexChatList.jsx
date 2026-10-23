import { useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { usePaginatedQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { useAuthSession } from "../../context/AuthSessionContext";
import { messageRoute } from "../../lib/messageNavigation";
import FetchChats from "../FetchChats";
import ChatQueryBoundary from "./ChatQueryBoundary";
import { chatText } from "./chatText";
import useListDeletion from "../../hooks/useListDeletion";
import ListDeletionControls from "../CustomHookUi/ListDeletionControls";
import { displayName } from "../../shared/displayName";

const PAGE_SIZE = 20;

function ChatList({ text, onRefresh }) {
  const { profile } = useAuthSession();
  const router = useRouter();
  const deletion = useListDeletion("chat");
  const { results, status, loadMore } = usePaginatedQuery(api.chats.getMyChats, {}, { initialNumItems: PAGE_SIZE });
  const loadNext = () => { if (status === "CanLoadMore") loadMore(PAGE_SIZE); };
  if (status === "LoadingFirstPage") return <View className="flex-1 items-center justify-center bg-white">
    <ActivityIndicator size="large" color="#b88144" accessibilityLabel={text.loadingChats} />
  </View>;

  return <View className="flex-1 bg-gray-50">
    <ListDeletionControls deletion={deletion} />
    <FlatList
      data={results}
      keyExtractor={item => item.chatId}
      renderItem={({ item }) => <FetchChats
        item={{
          _id: item.chatId,
          lastMessageAt: item.lastMessageAt,
          lastMessage: item.lastMessage,
          unreadCount: item.unreadCount ?? 0,
          participants: { _id: item.peer?._id, FullName: displayName(item.peer, text.user), avatar: item.peer?.imageUrl },
        }}
        showPresence={false}
        currentUserId={profile._id}
        selectionMode={deletion.active} isSelected={deletion.selected.has(item.chatId)} disabled={deletion.pending}
        onLongPress={deletion.toggle} onSelect={deletion.toggle}
        onOpen={() => router.push(messageRoute(item.chatId))}
      />}
      onEndReached={() => { if (results.length) loadNext(); }}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} colors={["#b88144"]} tintColor="#b88144" />}
      ListFooterComponent={status === "LoadingMore" ? <ActivityIndicator color="#b88144" style={{ marginVertical: 20 }} />
        : status === "CanLoadMore" ? <TouchableOpacity accessibilityRole="button" onPress={loadNext} className="items-center py-4">
          <Text className="font-semibold text-[#b88144]">{text.loadMore}</Text>
        </TouchableOpacity> : null}
      ListEmptyComponent={status === "Exhausted" ? <View className="items-center mt-10">
        <Ionicons name="person-outline" size={50} color="#94a3b8" />
        <Text className="text-center font-bold text-lg text-slate-400 mt-2">{text.empty}</Text>
      </View> : null}
    />
  </View>;
}

export default function ConvexChatList() {
  const { ready, profile } = useAuthSession();
  const { i18n } = useTranslation();
  const text = chatText[i18n.language === "ar" ? "ar" : "en"];
  const [revision, setRevision] = useState(0);
  const reload = () => setRevision(value => value + 1);
  if (!ready) return <View className="flex-1 items-center justify-center bg-white">
    <ActivityIndicator size="large" color="#b88144" accessibilityLabel={text.loadingChats} />
  </View>;
  return <ChatQueryBoundary key={`${profile._id}:${revision}`} fallback={<View className="flex-1 items-center justify-center bg-white px-6">
    <Text className="text-center text-gray-600 mb-4">{text.listError}</Text>
    <TouchableOpacity accessibilityRole="button" onPress={reload} className="bg-[#b88144] px-5 py-3 rounded-full">
      <Text className="text-white font-semibold">{text.retry}</Text>
    </TouchableOpacity>
  </View>}>
    <ChatList text={text} onRefresh={reload} />
  </ChatQueryBoundary>;
}
