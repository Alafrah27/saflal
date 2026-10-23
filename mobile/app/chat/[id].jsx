import {
    View,
    StatusBar,
    Keyboard,
    TouchableWithoutFeedback,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Text,
    TouchableOpacity,
    Alert,
} from "react-native";
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

import SendInput from "../../components/ui/SendInput";
import { MessageBubble } from "../../components/ui/messages";
import { ConnectedChatHeader } from "../../components/chat/ChatHeader";
import DateSeparator from "../../components/chat/DateSeparator";
import { useGetChatMessages, useDeleteMessages } from "../../store/transtack/query";
import { Ionicons } from "@expo/vector-icons";
import { Phone } from "lucide-react-native";
import { SocketIoStore } from "../../store/socketioStore";
import { useAuthStore } from "../../store/Store";
import ActionModal from "../../components/CustomHookUi/ActionModel";
import UserProfileSheet from "../../components/chat/UserProfileSheet";
import { useCallStore } from "../../store/callStore";
import ConvexConversationScreen from "../../components/chat/ConvexConversationScreen";

const MAIN_COLOR = "#b88144";
// WhatsApp light theme background color
const WA_BG_COLOR = "#EFEAE2";



function buildListData(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return [];
    const result = [];
    let lastDate = null;

    // Messages are now newest-first natively from the backend.
    // Inverted FlatList renders bottom-up.
    for (const msg of messages) {
        const msgDate = dayjs(msg.createdAt).format("YYYY-MM-DD");
        if (msgDate !== lastDate) {
            result.push({ _id: `date-${msgDate}`, type: "date", date: msg.createdAt });
            lastDate = msgDate;
        }
        result.push({ ...msg, type: "message" });
    }
    return result;
}

export default function ChatId() {
    const { source } = useLocalSearchParams();
    return source === "convex" ? <ConvexConversationScreen /> : <LegacyChatId />;
}

// Keep existing legacy links operational without passing Convex IDs to REST.
function LegacyChatId() {
    const { id, name, avatar, userId: otherUserId } = useLocalSearchParams();
    const router = useRouter();
    const { i18n } = useTranslation();
    const { user } = useAuthStore();

    const [refreshing, setRefreshing] = useState(false);
    const flatListRef = useRef(null);
    const profileSheetRef = useRef(null);

    // Selection mode state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Delete mutation
    const { mutate: deleteMessages, isPending: isDeleting } = useDeleteMessages();

    // Socket store
    const joinChat = SocketIoStore((s) => s.joinChat);
    const leaveChat = SocketIoStore((s) => s.leaveChat);
    const typingUsers = SocketIoStore((s) => s.typingUsers);

    const isTyping = !!typingUsers?.[id];

    // Join/Leave chat room for real-time messages
    useEffect(() => {
        if (id) joinChat(id);
        return () => {
            if (id) leaveChat(id);
        };
    }, [id, joinChat, leaveChat]);

    // Fetch messages from API
    const {
        data,
        isLoading,
        isFetching,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        error,
        refetch
    } = useGetChatMessages(id);

    // Safe messages array
    const safeMessages = useMemo(() => {
        return data?.pages ? data.pages.flatMap((page) => page) : [];
    }, [data]);

    // Keyboard animation
    const keyboardHeight = useSharedValue(0);
    useKeyboardHandler(
        {
            onMove: (event) => {
                "worklet";
                keyboardHeight.value = Math.max(event.height, 0);
            },
        },
        []
    );

    const fakeView = useAnimatedStyle(() => ({
        height: Math.abs(keyboardHeight.value),
    }), []);

    const listData = useMemo(() => buildListData(safeMessages), [safeMessages]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // ── Selection handlers ──
    const handleLongPress = useCallback((messageId) => {
        setSelectionMode(true);
        setSelectedIds(new Set([messageId]));
    }, []);

    const handleSelect = useCallback((messageId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(messageId)) {
                next.delete(messageId);
                if (next.size === 0) setSelectionMode(false);
            } else {
                next.add(messageId);
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
        deleteMessages(
            { messageIds: idsArray, chatId: id },
            {
                onSuccess: () => {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                },
            }
        );
    }, [selectedIds, deleteMessages, id]);

    const renderItem = useCallback(({ item }) => {
        if (item.type === "date") {
            return <DateSeparator date={item?.date} />;
        }
        return (
            <MessageBubble
                item={item}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(item?._id)}
                onLongPress={handleLongPress}
                onSelect={handleSelect}
            />
        );
    }, [selectionMode, selectedIds, handleLongPress, handleSelect]);

    const keyExtractor = useCallback((item) => item?._id, []);
    const handleBack = useCallback(() => router.back(), [router]);
    const handleProfilePress = useCallback(() => {
        profileSheetRef.current?.present();
    }, []);

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: selectionMode ? "#fff" : MAIN_COLOR },
                    headerTintColor: selectionMode ? "#1F2937" : "white",
                    headerTitle: "",
                    headerLeft: () =>
                        selectionMode ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 4 }}>
                                <TouchableOpacity onPress={handleCancelSelection}>
                                    <Ionicons name="close" size={26} color="#374151" />
                                </TouchableOpacity>
                                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937" }}>
                                    {selectedIds.size} selected
                                </Text>
                            </View>
                        ) : (
                            <ConnectedChatHeader
                                name={name || "User"}
                                avatar={avatar}
                                userId={otherUserId}
                                chatId={id}
                                onBack={handleBack}
                                onProfilePress={handleProfilePress}
                                language={i18n.language}
                            />
                        ),
                    headerRight: () =>
                        selectionMode ? (
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
                                    marginRight: 4,
                                }}
                            >
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 14 }}>
                                    {isDeleting ? "..." : "Delete"}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{ flexDirection: "row", alignItems: "center", marginRight: 10, gap: 15 }}>
                                {(() => {
                                    try {

                                    } catch (e) {
                                        // Fallback: custom socket-based call when native modules unavailable
                                        return (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    useCallStore.getState().setCurrentUser(user);
                                                    useCallStore.getState().initiateCall({ _id: otherUserId, FullName: name, avatar });
                                                }}
                                                style={{ padding: 4 }}
                                            >
                                                <Phone size={24} color="white" />
                                            </TouchableOpacity>
                                        );
                                    }
                                })()}
                            </View>
                        ),
                }}
            />
            <StatusBar
                backgroundColor={selectionMode ? "#fff" : MAIN_COLOR}
                barStyle={selectionMode ? "dark-content" : "light-content"}
            />

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={{ flex: 1, backgroundColor: WA_BG_COLOR }}>
                    {isLoading && safeMessages.length === 0 ? (
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                            <ActivityIndicator size="large" color={MAIN_COLOR} />
                        </View>
                    ) : error && safeMessages.length === 0 ? (
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
                            <Ionicons name="cloud-offline-outline" size={48} color="#94A3B8" />
                            <Text style={{ color: "#94A3B8", fontSize: 16, marginTop: 8, textAlign: "center" }}>Couldn't load messages</Text>
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={listData || []}
                            keyExtractor={keyExtractor}
                            renderItem={renderItem}
                            inverted
                            contentContainerStyle={{
                                paddingVertical: 10,
                                ...(listData?.length === 0 && { flex: 1, justifyContent: "center", alignItems: "center" }),
                            }}
                            showsVerticalScrollIndicator={false}
                            keyboardDismissMode="on-drag"
                            keyboardShouldPersistTaps="handled"
                            onEndReached={() => {
                                if (hasNextPage && !isFetchingNextPage) {
                                    fetchNextPage();
                                }
                            }}
                            onEndReachedThreshold={0.5}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    colors={[MAIN_COLOR]}
                                    tintColor={MAIN_COLOR}
                                />
                            }
                            ListEmptyComponent={
                                !isFetching && (
                                    <View style={{ alignItems: "center" }}>
                                        <Ionicons name="chatbubble-ellipses-outline" size={56} color="#CBD5E1" />
                                        <Text style={{ color: "#94A3B8", fontSize: 16, fontWeight: "600", marginTop: 10 }}>No messages yet</Text>
                                        <Text style={{ color: "#CBD5E1", fontSize: 13, marginTop: 4 }}>Say hello! 👋</Text>
                                    </View>
                                )
                            }
                            ListHeaderComponent={
                                isTyping ? (
                                    <View style={{ padding: 10, alignSelf: "flex-start", marginLeft: 10, marginBottom: 10 }}>
                                        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 }}>
                                            <Text style={{ fontStyle: "italic", color: "#94A3B8", fontSize: 13 }}>
                                                {name || "User"} {i18n.language === "ar" ? "يكتب..." : "is typing..."}
                                            </Text>
                                        </View>
                                    </View>
                                ) : null
                            }
                            ListFooterComponent={
                                isFetchingNextPage ? (
                                    <View style={{ paddingVertical: 20 }}>
                                        <ActivityIndicator size="small" color={MAIN_COLOR} />
                                    </View>
                                ) : null
                            }
                        />
                    )}
                </View>
            </TouchableWithoutFeedback>

            {/* Hide SendInput during selection mode */}
            {!selectionMode && <SendInput chatId={id} />}
            <Animated.View style={fakeView} />

            {/* Delete confirmation modal */}
            <ActionModal
                visible={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title={i18n.language === "ar" ? "حذف الرسائل" : "Delete Messages"}
                description={i18n.language === "ar" ? `هل أنت متأكد من رغبتك في حذف ${selectedIds.size} رسالة${selectedIds.size > 1 ? "s" : ""}? لا يمكن التراجع عن هذا الإجراء.` : `Are you sure you want to delete ${selectedIds.size} message${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`}
                cancelLabel={i18n.language === "ar" ? "إلغاء" : "Cancel"}
                actionLabel={i18n.language === "ar" ? "حذف" : "Delete"}
                isDangerous={true}
                onHandleFn={handleDeleteConfirm}
            />

            {/* User Profile Bottom Sheet */}
            <UserProfileSheet ref={profileSheetRef} userId={otherUserId} />
        </>
    );
}
