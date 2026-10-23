import { View, Text, TouchableOpacity, Image } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { SocketIoStore } from "../../store/socketioStore";

const MAIN_COLOR = "#b88144";

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

/**
 * Pure presentational component — NO hooks.
 * This is rendered inside Stack.Screen's `headerLeft` render prop,
 * which is a callback, not a proper React component tree.
 * All dynamic data must come through props.
 */
export default function ChatHeader({ name, avatar, userId, isOnline, isTyping, onBack, onProfilePress, language, showStatus = true }) {
    const bgColor = hashColor(userId);
    const isRTL = language === "ar";

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                marginLeft: 4,
                gap: 8,
            }}
        >
            <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel={isRTL ? "رجوع" : "Back"}>
                <Ionicons
                    name={isRTL ? "arrow-forward" : "arrow-back"}
                    size={24}
                    color="white"
                />
            </TouchableOpacity>

            <TouchableOpacity onPress={onProfilePress} disabled={!onProfilePress} accessibilityRole="button" accessibilityLabel={`${isRTL ? "الملف الشخصي" : "User profile"}: ${name}`} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {/* Avatar */}
                <View style={{ position: "relative" }}>
                    {avatar ? (
                        <Image
                            source={{ uri: avatar }}
                            style={{ width: 40, height: 40, borderRadius: 20 }}
                        />
                    ) : (
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: bgColor,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                                {name?.charAt(0)?.toUpperCase()}
                            </Text>
                        </View>
                    )}
                    {/* Online dot */}
                    {isOnline && (
                        <View
                            style={{
                                position: "absolute",
                                bottom: 0,
                                right: 0,
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                backgroundColor: "#22C55E",
                                borderWidth: 2,
                                borderColor: MAIN_COLOR,
                            }}
                        />
                    )}
                </View>

                {/* Name & status */}
                <View>
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                        {name}
                    </Text>
                    {showStatus && <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
                        {isTyping
                            ? isRTL ? "يكتب..." : "typing..."
                            : isOnline
                                ? isRTL ? "متصل" : "Online"
                                : isRTL ? "غير متصل" : "Offline"}
                    </Text>}
                </View>
            </TouchableOpacity>
        </View>
    );
}

export const ConnectedChatHeader = ({ name, avatar, userId, chatId, onBack, onProfilePress, language }) => {
    const typingUsers = SocketIoStore((s) => s.typingUsers);
    const onlineUsers = SocketIoStore((s) => s.onlineUsers);

    const isTyping = !!typingUsers?.[chatId];
    const safeOnlineUsers = Array.isArray(onlineUsers) ? onlineUsers : [];
    const isOnline = safeOnlineUsers.includes(userId || chatId);

    return (
        <ChatHeader
            name={name}
            avatar={avatar}
            userId={userId}
            isOnline={isOnline}
            isTyping={isTyping}
            onBack={onBack}
            onProfilePress={onProfilePress}
            language={language}
        />
    );
};
