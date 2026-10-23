import { Component, useState } from "react";
import { displayName } from "../../shared/displayName";
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthSession } from "../../context/AuthSessionContext";
import ConvexUserItem from "../../components/users/ConvexUserItem";
import { contactText } from "../../components/users/contactText";
import FriendRequestActions from "../../components/users/FriendRequestActions";
import useOrderedContacts from "../../hooks/useOrderedContacts";
import { contactsLaunchSeed } from "../../lib/contactOrderSeed";

const PAGE_SIZE = 20;

// Keep failed subscriptions inside this tab so the other tabs remain usable.
class ContactsErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-gray-600 mb-4">{this.props.text.loadError}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={this.props.onRetry} className="bg-[#b88144] px-5 py-3 rounded-full">
          <Text className="text-white font-semibold">{this.props.text.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

export function ContactsList({ text, onRefresh, requests = false }) {
  return requests ? <RequestsList text={text} onRefresh={onRefresh} /> : <OrderedUsersList text={text} onRefresh={onRefresh} />;
}

function RequestsList({ text, onRefresh }) {
  const pagination = usePaginatedQuery(api.friendRequests.getPendingFriendRequests, {}, { initialNumItems: PAGE_SIZE });
  return <ContactRows text={text} onRefresh={onRefresh} requests pagination={pagination} />;
}

function OrderedUsersList({ text, onRefresh }) {
  const pagination = useOrderedContacts();
  return <ContactRows text={text} onRefresh={onRefresh} pagination={pagination} />;
}

function ContactRows({ text, onRefresh, requests = false, pagination }) {
  const { results, status, loadMore } = pagination;
  const loadNextPage = () => {
    if (status === "CanLoadMore") loadMore(PAGE_SIZE);
  };

  if (status === "LoadingFirstPage") {
    return <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#b88144" accessibilityLabel={text.loading} />
    </View>;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={results}
        keyExtractor={item => item._id}
        renderItem={({ item }) => requests ? <View className="py-4 px-3 bg-white border-b border-gray-100">
          <View className="flex-row items-center gap-3">
            {item.sender?.imageUrl && <Image source={{ uri: item.sender.imageUrl }} style={{ width: 50, height: 50, borderRadius: 25 }} />}
            <Text className="font-bold text-base text-gray-800 flex-1">{displayName(item.sender, text.unavailableUser)}</Text>
          </View>
          <FriendRequestActions key={item._id} requestId={item._id} text={text} />
        </View> : <ConvexUserItem item={item} text={text} />}
        onEndReached={() => { if (results.length > 0) loadNextPage(); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={status === "LoadingMore" ? (
          <ActivityIndicator size="small" color="#b88144" style={{ marginVertical: 20 }} accessibilityLabel={text.loading} />
        ) : status === "CanLoadMore" ? (
          <TouchableOpacity accessibilityRole="button" onPress={loadNextPage} className="items-center py-4">
            <Text className="font-semibold text-[#b88144]">{text.loadMore}</Text>
          </TouchableOpacity>
        ) : null}
        ListEmptyComponent={status === "Exhausted" ? (
          <View className="items-center mt-10">
            <Ionicons name="person-outline" size={50} color="#94a3b8" />
            <Text className="text-center font-bold text-lg text-slate-400 mt-2">{text.empty}</Text>
          </View>
        ) : null}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} colors={["#b88144"]} tintColor="#b88144" />}
      />
    </View>
  );
}

function ContactsHome({ text }) {
  const [view, setView] = useState("users");
  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey(key => key + 1);
  const requests = view === "requests";
  const listText = requests ? { ...text, loading: text.requestsLoading, empty: text.requestsEmpty,
    loadMore: text.requestsLoadMore, loadError: text.requestsLoadError } : text;
  return <View className="flex-1 bg-white">
    <View accessibilityRole="tablist" className="flex-row gap-2 px-3 py-3">
      {["users", "requests"].map(value => <TouchableOpacity key={value}
        accessibilityRole="tab" accessibilityLabel={text[value]} accessibilityState={{ selected: view === value }}
        onPress={() => setView(value)}
        style={{ borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: view === value ? "#b88144" : "#f3f4f6" }}>
        <Text style={{ color: view === value ? "white" : "#374151", fontWeight: "600" }}>{text[value]}</Text>
      </TouchableOpacity>)}
    </View>
    <ContactsErrorBoundary key={`${view}:${refreshKey}`} text={listText} onRetry={reload}>
      <ContactsList text={listText} onRefresh={reload} requests={requests} />
    </ContactsErrorBoundary>
  </View>;
}

export default function Contacts() {
  const { ready, profile } = useAuthSession();
  const { i18n } = useTranslation();
  const text = contactText[i18n.language === "ar" ? "ar" : "en"];

  if (!ready) {
    return <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#b88144" accessibilityLabel={text.loading} />
    </View>;
  }

  return <ContactsHome key={`${profile._id}:${contactsLaunchSeed}`} text={text} />;
}
