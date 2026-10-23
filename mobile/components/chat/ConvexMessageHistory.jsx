import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { usePaginatedQuery } from "convex/react";
import dayjs from "dayjs";
import { api } from "../../convex/_generated/api";
import VoiceMessage from "./VoiceMessage";
import MessageReceipt from "./MessageReceipt";
import useChatRead from "../../hooks/useChatRead";
import useMessageDeletion from "../../hooks/useMessageDeletion";

export default function ConvexMessageHistory({ chatId, userId, text }) {
  const { results, status, loadMore } = usePaginatedQuery(api.messages.listMessages, { chatId }, { initialNumItems: 20 });
  const [now, setNow] = useState(() => Date.now());
  const { pendingId, requestDelete } = useMessageDeletion(chatId, userId, text);
  const visible = results.filter(message => message.expiresAt === undefined || message.expiresAt > now);
  useChatRead(chatId, status === "LoadingFirstPage" ? undefined : visible[0]?._id);
  useEffect(() => {
    const deadline = results.reduce((next, message) => message.expiresAt > now ? Math.min(next, message.expiresAt) : next, Infinity);
    if (!Number.isFinite(deadline)) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(2147483647, Math.max(1, deadline - Date.now())));
    return () => clearTimeout(timer);
  }, [results, now]);
  const loadNext = () => { if (status === "CanLoadMore") loadMore(20); };
  if (status === "LoadingFirstPage") return <View style={{ flex: 1, justifyContent: "center" }}>
    <ActivityIndicator accessibilityLabel={text.loadingMessages} color="#b88144" />
  </View>;
  return <FlatList style={{ flex: 1 }} inverted
    data={visible}
    keyExtractor={item => item._id} keyboardShouldPersistTaps="handled"
    renderItem={({ item }) => {
      const own = item.senderId === userId;
      const deleted = item.deletedAt !== undefined;
      const deleting = pendingId === item._id;
      const canDelete = own && !deleted;
      const Bubble = canDelete ? TouchableOpacity : View;
      const deletionProps = canDelete ? {
        onLongPress: () => requestDelete(item), delayLongPress: 500,
        accessibilityActions: [{ name: "delete", label: text.deleteMessage }],
        onAccessibilityAction: event => { if (event.nativeEvent.actionName === "delete") requestDelete(item); },
        accessibilityHint: text.deleteMessageHint,
      } : {};
      return <View style={{ paddingHorizontal: 12, paddingVertical: 4, alignItems: own ? "flex-end" : "flex-start" }}>
        <Bubble {...(canDelete ? { activeOpacity: 1, ...deletionProps, disabled: !!pendingId, accessibilityState: { busy: deleting } } : {})}
          style={{ maxWidth: "80%", borderRadius: 16, padding: 12, backgroundColor: own ? "#b88144" : "#fff" }}>
          {deleted ? <Text style={{ fontSize: 15, fontStyle: "italic", color: own ? "white" : "#64748b", textAlign: text.rtl ? "right" : "left" }}>
            {own ? text.youDeletedMessage : text.messageDeleted}
          </Text> : item.type === "text" ? <Text selectable={!own} style={{ fontSize: 15, color: own ? "white" : "#1e293b" }}>{item.text}</Text>
            : <VoiceMessage message={item} text={text} own={own} deletionProps={deletionProps} deleting={deleting} />}
          <View style={{ flexDirection: "row", alignSelf: "flex-end", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Text style={{ fontSize: 10, color: own ? "#ffffffcc" : "#64748b" }}>{dayjs(item.createdAt).format("HH:mm")}</Text>
            {deleting ? <ActivityIndicator size="small" accessibilityLabel={text.deletingMessage} color="white" />
              : own && !deleted && <MessageReceipt status={item.status} text={text} onBubble />}
          </View>
        </Bubble>
      </View>;
    }}
    onEndReached={loadNext} onEndReachedThreshold={0.4}
    ListEmptyComponent={status === "Exhausted" ? <Text style={{ textAlign: "center", margin: 24, color: "#64748b" }}>{text.emptyMessages}</Text> : null}
    ListFooterComponent={status === "LoadingMore" ? <ActivityIndicator color="#b88144" />
      : status === "CanLoadMore" ? <TouchableOpacity onPress={loadNext} accessibilityRole="button" accessibilityLabel={text.olderMessages}>
        <Text style={{ textAlign: "center", color: "#b88144", margin: 16 }}>{text.olderMessages}</Text>
      </TouchableOpacity> : null}
  />;
}
