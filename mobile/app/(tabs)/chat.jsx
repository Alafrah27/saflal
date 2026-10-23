import { View, FlatList, RefreshControl, Text, ActivityIndicator, TouchableOpacity, TextInput, SectionList } from "react-native";
import { useGetAllUsers, useGetMyChats, useDeleteChats } from "../../store/transtack/query";
import FetchUsers from "../../components/users/FetchUsers";
import { useLayoutEffect, useState, useMemo, useEffect, useCallback } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SocketIoStore } from "../../store/socketioStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FetchChats from "../../components/FetchChats";
import ActionModal from "../../components/CustomHookUi/ActionModel";
import { useTranslation } from "react-i18next";
import ConvexChatList from "../../components/chat/ConvexChatList";

export default function Chat() {
    const { source } = useLocalSearchParams();
    return source === "legacy" ? <LegacyChatList /> : <ConvexChatList />;
}

// Preserve the previous screen for explicitly legacy navigation during migration.
function LegacyChatList() {
    const [searchValue, setSearchValue] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [localCache, setLocalCache] = useState([]);
    const [hasServerResponded, setHasServerResponded] = useState(false);
    const navigation = useNavigation();
    const { i18n } = useTranslation();
    // Selection mode state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Delete mutation
    const { mutate: deleteChats, isPending: isDeleting } = useDeleteChats();

    // 1. Get online status

    const onlineUsersRaw = SocketIoStore((state) => state?.onlineUsers);
    const onlineUsers = useMemo(() => Array.isArray(onlineUsersRaw) ? onlineUsersRaw : [], [onlineUsersRaw]);

    // 2. Fetch users hook
    const {
        data,
        error,
        refetch,
        isLoading,
        isFetching,
        isSuccess,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage
    } = useGetMyChats();

    const serverData = useMemo(() => {
        return data?.pages ? data.pages.flatMap((page) => page) : [];
    }, [data]);

    // 3. Load cache manually on first mount
    useEffect(() => {
        const loadCache = async () => {
            const cached = await AsyncStorage.getItem("chats_cache");
            if (cached) setLocalCache(JSON.parse(cached));
        };
        loadCache();
    }, []);

    // 4. CRITICAL: When server responds, update local cache to match server data
    useEffect(() => {
        if (isSuccess && serverData !== undefined) {
            setHasServerResponded(true);
            setLocalCache(serverData || []);
        }
    }, [isSuccess, serverData]);

    // 5. Determine what data to show
    const finalData = useMemo(() => {
        // If server has responded, ALWAYS use server data
        if (hasServerResponded) {
            return Array.isArray(serverData) ? serverData : [];
        }

        // If still loading and we have cache, show cache temporarily
        if (isLoading && localCache?.length > 0) {
            return localCache;
        }

        // If we have server data, use it
        if (serverData && serverData?.length > 0) {
            return serverData;
        }

        return [];
    }, [serverData, localCache, hasServerResponded, isLoading]);

    // 6. Filter the combined data
    const filteredData = useMemo(() => {
        if (!Array.isArray(finalData)) return [];
        return finalData.filter((item) =>
            item?.participants?.FullName?.toLowerCase()?.includes(searchValue?.toLowerCase())
        );
    }, [finalData, searchValue]);

    // Pull to refresh
    const onRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            // Clear local cache before refetching
            await AsyncStorage.removeItem("users_cache");
            setLocalCache([]);
            await refetch();
        } finally {
            setRefreshing(false);
        }
    }, [refetch]);



    // ── Selection handlers ──
    const handleLongPress = useCallback((chatId) => {
        setSelectionMode(true);
        setSelectedIds(new Set([chatId]));
    }, []);

    const handleSelect = useCallback((chatId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(chatId)) {
                next.delete(chatId);
                // Exit selection mode if nothing selected
                if (next.size === 0) setSelectionMode(false);
            } else {
                next.add(chatId);
            }
            return next;
        });
    }, []);

    const handleCancelSelection = useCallback(() => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    }, []);

    const handleDeleteConfirm = useCallback(() => {
        const idsArray = Array.from(selectedIds);
        deleteChats(idsArray, {
            onSuccess: () => {
                setSelectionMode(false);
                setSelectedIds(new Set());
            },
        });
    }, [selectedIds, deleteChats]);

    // UI Logic: Only show big spinner if NO cache and NO server data
    const showInitialLoading = isLoading && finalData?.length === 0;

    if (showInitialLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#b88144" />
            </View>
        );
    }


    return (
        <View className="flex-1 bg-white">
            {/* Status bar spacer */}
            <View className="pt-12 bg-white" />

            <View className="flex-1 bg-gray-50">
                {/* Selection mode header bar */}
                {selectionMode && (
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: "#fff",
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: "#E5E7EB",
                            elevation: 2,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                        }}
                    >
                        {/* Left: Close button + Count */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <TouchableOpacity onPress={handleCancelSelection}>
                                <Ionicons name="close" size={26} color="#374151" />
                            </TouchableOpacity>
                            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>
                                {selectedIds.size} selected
                            </Text>
                        </View>

                        {/* Right: Delete button */}
                        <TouchableOpacity
                            onPress={() => setShowDeleteModal(true)}
                            disabled={isDeleting}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: "#FEE2E2",
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 20,
                                gap: 6,
                            }}
                        >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 14 }}>
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Syncing indicator if background update is happening */}
                {isFetching && !isFetchingNextPage && !refreshing && finalData?.length > 0 && !selectionMode && (
                    <View className="absolute top-0 left-0 right-0 z-10 bg-[#b88144]/10 py-1">
                        <Text className="text-center text-[10px] text-[#b88144]">{i18n.language === "ar" ? "جاري تحديث المحادثات..." : "Updating chats..."}</Text>
                    </View>
                )}

                {!selectionMode ? (
                    <SectionList
                        sections={[{ data: filteredData || [] }]}
                        keyExtractor={(item) => item?._id?.toString()}
                        ListHeaderComponent={() => (
                            <View className="px-5 pt-2 pb-2 bg-white flex-row justify-between items-center">
                                <Text className="text-3xl font-extrabold text-gray-800">
                                    {i18n.language === "ar" ? "المحادثات" : "Chats"}
                                </Text>
                            </View>
                        )}
                        renderSectionHeader={() => (
                            <View className="px-5 py-3 bg-white border-b border-gray-100 flex-col gap-3">
                                <View className="flex-row items-center bg-[#b88144]/15 rounded-xl px-4 py-2">
                                    <Ionicons name="search" size={20} color="#b88144" style={{ marginRight: 8 }} />
                                    <TextInput
                                        className="flex-1 text-black"
                                        placeholder={i18n.language === "ar" ? "البحث في المحادثات..." : "Search..."}
                                        value={searchValue}
                                        onChangeText={setSearchValue}
                                        placeholderTextColor="#b88144"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>
                        )}
                        stickySectionHeadersEnabled={true}
                        renderItem={({ item }) => (
                            <FetchChats
                                item={item}
                                online={onlineUsers?.includes(item?.participants?._id)}
                                selectionMode={selectionMode}
                                isSelected={selectedIds.has(item?._id)}
                                onLongPress={handleLongPress}
                                onSelect={handleSelect}
                            />
                        )}
                        onEndReached={() => {
                            if (hasNextPage && !isFetchingNextPage) {
                                fetchNextPage();
                            }
                        }}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            isFetchingNextPage ? (
                                <View style={{ paddingVertical: 20 }}>
                                    <ActivityIndicator size="small" color="#b88144" />
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={
                            !isFetching && (
                                <View className="flex-1 items-center mt-10">
                                    <Ionicons name="person-outline" size={50} color="#94a3b8" />
                                    <Text className="text-center font-bold text-lg text-slate-400 mt-2">{i18n.language === "ar" ? "لا توجد محادثات" : "No chats found"}</Text>
                                </View>
                            )
                        }
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={["#b88144"]}
                                tintColor="#b88144"
                            />
                        }
                    />
                ) : (
                    <FlatList
                        data={filteredData}
                        keyExtractor={(item) => item?._id?.toString()}
                        renderItem={({ item }) => (
                            <FetchChats
                                item={item}
                                online={onlineUsers?.includes(item?.participants?._id)}
                                selectionMode={selectionMode}
                                isSelected={selectedIds.has(item?._id)}
                                onLongPress={handleLongPress}
                                onSelect={handleSelect}
                            />
                        )}
                        ListEmptyComponent={
                            !isFetching && (
                                <View className="flex-1 items-center mt-10">
                                    <Ionicons name="person-outline" size={50} color="#94a3b8" />
                                    <Text className="text-center font-bold text-lg text-slate-400 mt-2">{i18n.language === "ar" ? "لا توجد محادثات" : "No chats found"}</Text>
                                </View>
                            )
                        }
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={["#b88144"]}
                                tintColor="#b88144"
                            />
                        }
                    />
                )}
            </View>

            {/* Delete confirmation modal */}
            <ActionModal
                visible={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title={i18n.language === "ar" ? "حذف المحادثات" : "Delete Conversations"}
                description={i18n.language === "ar" ? `هل أنت متأكد من رغبتك في حذف ${selectedIds.size} محادثة${selectedIds.size > 1 ? "s" : ""}? سيؤدي هذا إلى إزالة جميع الرسائل بشكل دائم.` : `Are you sure you want to delete ${selectedIds.size} conversation${selectedIds.size > 1 ? "s" : ""}? This will permanently remove all messages.`}
                cancelLabel={i18n.language === "ar" ? "إلغاء" : "Cancel"}
                actionLabel={i18n.language === "ar" ? "حذف" : "Delete"}
                isDangerous={true}
                onHandleFn={handleDeleteConfirm}
            />
        </View>
    );
}
