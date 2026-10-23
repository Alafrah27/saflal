import { View, Text, TouchableOpacity, Image } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRouter } from "expo-router";
import { SocketIoStore } from "../../store/socketioStore";

dayjs.extend(relativeTime);

/* ── Avatar color palette ── */
const AVATAR_COLORS = [
    "#F87171", "#60A5FA", "#34D399", "#FBBF24",
    "#A78BFA", "#FB923C", "#F472B6", "#38BDF8",
];

function hashColor(id) {
    if (!id) return AVATAR_COLORS[0];
    const str = String(id);
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ── Friendly timestamp ── */
function formatTime(date) {
    if (!date) return "";
    const d = dayjs(date);
    const now = dayjs();
    if (d.isSame(now, "day")) return d.format("hh:mm A");
    if (d.isSame(now.subtract(1, "day"), "day")) return "Yesterday";
    return d.format("MM/DD/YY");
}

export default function ChatListItem({ chat }) {
    const router = useRouter();
    const onlineUsers = SocketIoStore((s) => s.onlineUsers);

    const other = chat.participants; // Already formatted by backend as otherUser
    const isOnline = onlineUsers.includes(other?._id);
    const bgColor = hashColor(other?._id);

    const lastMsgPreview =
        chat.lastMessage?.messageType === "image"
            ? "📷 Photo"
            : chat.lastMessage?.messageType === "audio"
                ? "🎤 Voice"
                : chat.lastMessage?.messageType === "pdf"
                    ? "📄 Document"
                    : chat.lastMessage?.text || "Tap to start chatting";

    const handlePress = () => {
        router.push({
            pathname: `/chat/${chat._id}`,
            params: {
                name: other?.FullName,
                avatar: other?.avatar || "",
                userId: other?._id,
            },
        });
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: "#fff",
            }}
        >
            {/* ── Avatar ── */}
            <View style={{ position: "relative" }}>
                {other?.avatar ? (
                    <Image
                        source={{ uri: other.avatar }}
                        style={{ width: 54, height: 54, borderRadius: 27 }}
                    />
                ) : (
                    <View
                        style={{
                            width: 54,
                            height: 54,
                            borderRadius: 27,
                            backgroundColor: bgColor,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
                            {other?.FullName?.charAt(0)?.toUpperCase()}
                        </Text>
                    </View>
                )}
                {/* Online dot */}
                {isOnline && (
                    <View
                        style={{
                            position: "absolute",
                            bottom: 2,
                            right: 2,
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: "#22C55E",
                            borderWidth: 2,
                            borderColor: "#fff",
                        }}
                    />
                )}
            </View>

            {/* ── Info ── */}
            <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text
                        numberOfLines={1}
                        style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: "#1E293B",
                            flex: 1,
                            marginRight: 8,
                        }}
                    >
                        {other?.FullName}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                        {formatTime(chat.lastMessageAt)}
                    </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <Text
                        numberOfLines={1}
                        style={{
                            fontSize: 13,
                            color: "#64748B",
                            flex: 1,
                            marginRight: 8,
                        }}
                    >
                        {lastMsgPreview}
                    </Text>

                    {/* Unread badge */}
                    {chat.unreadCount > 0 && (
                        <View
                            style={{
                                minWidth: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: "#b88144",
                                alignItems: "center",
                                justifyContent: "center",
                                paddingHorizontal: 6,
                            }}
                        >
                            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                                {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}
