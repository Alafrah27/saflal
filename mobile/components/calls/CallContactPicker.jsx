import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { displayName } from "../../shared/displayName";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import CallAvatar from "./CallAvatar";

export default function CallContactPicker({ text, isArabic, bottomInset, disabled, onCall, onContacts }) {
  const { results, status, loadMore } = usePaginatedQuery(api.contacts.listUsers, { friendsOnly: true }, { initialNumItems: 20 });
  const loadNext = () => { if (status === "CanLoadMore") loadMore(20); };
  if (status === "LoadingFirstPage") return <ActivityIndicator color="#b88144" size="large" accessibilityLabel={text.loadingContacts} style={{ padding: 40 }} />;
  return <BottomSheetFlatList data={results} keyExtractor={item => item._id}
    contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomInset + 24 }}
    renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${text.callContact}: ${displayName(item)}`}
      accessibilityState={{ disabled }} disabled={disabled} onPress={() => onCall({ userId: item._id })}
      style={{ direction: isArabic ? "rtl" : "ltr", flexDirection: "row", alignItems: "center", gap: 12, padding: 16, opacity: disabled ? 0.5 : 1 }}>
      <CallAvatar peer={item} name={displayName(item)} />
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: "600", color: "#1f2937", textAlign: isArabic ? "right" : "left" }}>{displayName(item)}</Text>
      <Ionicons name="call-outline" size={22} color="#b88144" />
    </TouchableOpacity>}
    onEndReached={() => { if (results.length) loadNext(); }} onEndReachedThreshold={0.4}
    ListEmptyComponent={status === "Exhausted" ? <View style={{ padding: 24, alignItems: "center", gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#374151", textAlign: "center" }}>{text.noContacts}</Text>
      <Text style={{ color: "#6b7280", textAlign: "center" }}>{text.noContactsHint}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={onContacts} style={{ padding: 12 }}>
        <Text style={{ color: "#b88144", fontWeight: "700" }}>{text.contacts}</Text>
      </TouchableOpacity>
    </View> : null}
    ListFooterComponent={status === "LoadingMore" ? <ActivityIndicator color="#b88144" accessibilityLabel={text.loadingContacts} style={{ padding: 20 }} />
      : status === "CanLoadMore" ? <TouchableOpacity accessibilityRole="button" onPress={loadNext} style={{ alignItems: "center", padding: 20 }}>
        <Text style={{ fontWeight: "600", color: "#b88144" }}>{text.more}</Text>
      </TouchableOpacity> : null} />;
}
