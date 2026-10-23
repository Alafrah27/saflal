
import { View, Text, Image, TouchableOpacity } from "react-native";
import React, { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getColorFromId } from "../utils/getColorfromId";
import { useTranslation } from "react-i18next";
import { chatText } from "./chat/chatText";
import MessageReceipt from "./chat/MessageReceipt";



function formatTime(dateString, language, text) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // Today — show time like "8:12 PM"
        return date.toLocaleTimeString(language, { hour: "numeric", minute: "2-digit", hour12: true });
    } else if (diffDays === 1) {
        return text.yesterday;
    } else if (diffDays < 7) {
        // Show day name
        return date.toLocaleDateString(language, { weekday: "short" });
    } else {
        // Show date
        return date.toLocaleDateString(language, { month: "short", day: "numeric" });
    }
}

function getMessagePreview(lastMessage, text, currentUserId) {
    if (!lastMessage) return "";
    if (lastMessage.deletedAt !== undefined) return lastMessage.senderId === currentUserId ? text.youDeletedMessage : text.messageDeleted;
    if (lastMessage.type === "audio" || lastMessage.messageType === "audio") {
        const duration = lastMessage.audioDuration;
        const seconds = Number.isFinite(duration) && duration >= 0 ? Math.floor(duration) : null;
        return seconds === null ? text.voicePreview
            : `${text.voicePreview} · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    }
    if (lastMessage.messageType === "image") return "📷 Photo";
    if (lastMessage.messageType === "video") return "🎥 Video";
    if (lastMessage.messageType === "audio") return "🎵 Audio";
    if (lastMessage.messageType === "file") return "📎 File";
    return lastMessage.text || "";
}

const FetchChats = ({ item, currentUserId, online, selectionMode, isSelected, onLongPress, onSelect, onOpen, showPresence = true, disabled = false }) => {
    const router = useRouter();
    const { i18n } = useTranslation();
    const language = i18n.language === "ar" ? "ar" : "en", text = chatText[language];

    // The participant (the other person in the chat)
    const participant = item?.participants;
    const participantName = participant?.FullName || "Unknown";
    const participantAvatar = participant?.avatar;
    const [failedAvatar, setFailedAvatar] = useState(null);
    const participantId = participant?._id;
    const bgColor = useMemo(() => getColorFromId(participantId), [participantId]);

    const lastMessage = item?.lastMessage;
    const timeLabel = formatTime(item?.lastMessageAt, language, text);
    const messagePreview = getMessagePreview(lastMessage, text, currentUserId);
    const unreadCount = item?.unreadCount || 0;
    const hasUnread = unreadCount > 0;

    const handlePress = () => {
        if (selectionMode) {
            onSelect?.(item._id);
            return;
        }
        if (onOpen) {
            onOpen();
            return;
        }
        router.push({
            pathname: "/chat/[id]",
            params: {
                id: item._id,
                name: participantName,
                avatar: participantAvatar || "",
                userId: participantId,
            },
        });
    };

    const handleLongPress = () => {
        onLongPress?.(item._id);
    };

    return (
        <TouchableOpacity
            disabled={disabled} accessibilityRole="button" accessibilityLabel={participantName}
            accessibilityState={{ selected: !!isSelected, disabled }}
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={400}
            activeOpacity={0.6}
            style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 16,
                backgroundColor: isSelected ? "#EEF2FF" : "#fff",
                borderBottomWidth: 0.5,
                borderBottomColor: "#F0F0F0",
            }}
        >
            {/* Selection Checkbox */}
            {selectionMode && (
                <View
                    style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        borderWidth: 2,
                        borderColor: isSelected ? "#6C63FF" : "#D1D5DB",
                        backgroundColor: isSelected ? "#6C63FF" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                    }}
                >
                    {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                </View>
            )}

            {/* Avatar */}
            <View style={{ position: "relative" }}>
                {participantAvatar && failedAvatar !== participantAvatar ? (
                    <Image
                        source={{ uri: participantAvatar }}
                        onError={() => setFailedAvatar(participantAvatar)}
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: 28,
                        }}
                        resizeMode="cover"
                    />
                ) : (
                    <View
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: 28,
                            backgroundColor: bgColor,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text
                            style={{
                                color: "#fff",
                                fontWeight: "700",
                                fontSize: 22,
                            }}
                        >
                            {participantName?.charAt(0)?.toUpperCase()}
                        </Text>
                    </View>
                )}

                {/* Online indicator — hidden during selection mode */}
                {!selectionMode && showPresence && (
                    <View
                        style={{
                            position: "absolute",
                            bottom: 1,
                            right: 1,
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: online ? "#22C55E" : "#D1D5DB",
                            borderWidth: 2.5,
                            borderColor: "#fff",
                        }}
                    />
                )}
            </View>

            {/* Chat info */}
            <View style={{ flex: 1, marginLeft: 14 }}>
                {/* Top row: Name + Time */}
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                    }}
                >
                    <Text
                        numberOfLines={1}
                        style={{
                            fontSize: 16,
                            fontWeight: hasUnread ? "700" : "600",
                            color: "#1A1A2E",
                            flex: 1,
                            marginRight: 8,
                        }}
                    >
                        {participantName}
                    </Text>
                    <Text
                        style={{
                            fontSize: 12,
                            color: hasUnread ? "#6C63FF" : "#9CA3AF",
                            fontWeight: hasUnread ? "600" : "400",
                        }}
                    >
                        {timeLabel}
                    </Text>
                </View>

                {/* Bottom row: Message preview + Badge */}
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flex: 1,
                            marginRight: 8,
                        }}
                    >
                        {currentUserId && lastMessage?.senderId === currentUserId && lastMessage.deletedAt === undefined &&
                            <MessageReceipt status={lastMessage.status} text={text} />}
                        {lastMessage?.deletedAt === undefined && (lastMessage?.type === "audio" || lastMessage?.messageType === "audio") &&
                            <Ionicons name="mic-outline" size={15} color={hasUnread ? "#4b5563" : "#9ca3af"} style={{ marginEnd: 4 }} />}
                        <Text
                            numberOfLines={1}
                            style={{
                                fontSize: 14,
                                color: hasUnread ? "#4B5563" : "#9CA3AF",
                                fontWeight: hasUnread ? "500" : "400",
                                flex: 1,
                            }}
                        >
                            {messagePreview}
                        </Text>
                    </View>

                    {/* Unread badge */}
                    {hasUnread && (
                        <View
                            style={{
                                backgroundColor: "#6C63FF",
                                borderRadius: 12,
                                minWidth: 22,
                                height: 22,
                                alignItems: "center",
                                justifyContent: "center",
                                paddingHorizontal: 6,
                            }}
                        >
                            <Text
                                style={{
                                    color: "#fff",
                                    fontSize: 11,
                                    fontWeight: "700",
                                }}
                            >
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default FetchChats;