import { View, Text, Image, TouchableOpacity } from "react-native";
import React from "react";
import dayjs from "dayjs";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/Store";

export const MessageBubble = ({ item, selectionMode, isSelected, onLongPress, onSelect }) => {
    const { user } = useAuthStore();
    const isMe = item.sender?._id?.toString() === user?._id?.toString();

    // Status Icon Logic
    const getStatusIcon = () => {
        if (item.status === "sending") return "time-outline";
        if (item.status === "seen") return "checkmark-done";
        if (item.status === "failed") return "alert-circle";
        return "checkmark-done"; // Default 'delivered' state - double check
    };

    const getStatusColor = () => {
        if (item.status === "seen") return "#4FC3F7"; // Blue for seen
        if (item.status === "failed") return "#EF4444";
        return isMe ? "rgba(255,255,255,0.6)" : "#94A3B8"; // Grey for delivered
    };

    const handlePress = () => {
        if (selectionMode && isMe) {
            onSelect?.(item._id);
        }
    };

    const handleLongPress = () => {
        if (isMe) {
            onLongPress?.(item._id);
        }
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={400}
            activeOpacity={selectionMode && isMe ? 0.6 : 1}
            style={{
                flexDirection: "row",
                alignItems: isMe ? "flex-end" : "flex-start",
                marginVertical: 3,
                paddingHorizontal: 12,
            }}
        >
            {/* Selection checkbox — only for user's own messages */}
            {selectionMode && isMe && (
                <View
                    style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isSelected ? "#6C63FF" : "#D1D5DB",
                        backgroundColor: isSelected ? "#6C63FF" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                        alignSelf: "center",
                    }}
                >
                    {isSelected && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                </View>
            )}

            <View
                style={{
                    flexDirection: "column",
                    alignItems: isMe ? "flex-end" : "flex-start",
                    flex: 1,
                }}
            >
                <View
                    className={`max-w-[80%] px-3 py-2 rounded-2xl ${isMe ? "bg-[#b88144]" : "bg-[#F1F5F9]"
                        } ${isMe ? "rounded-br-none" : "rounded-bl-none"}`}
                    style={isSelected ? { opacity: 0.7 } : undefined}
                >
                    {/* Text Message */}
                    {item.text && (
                        <Text
                            style={{
                                fontSize: 15,
                                color: isMe ? "#fff" : "#1E293B",
                                lineHeight: 21,
                            }}
                        >
                            {item.text}
                        </Text>
                    )}

                    {/* Footer: Time + Status Icons */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            alignSelf: "flex-end",
                            marginTop: 3,
                            gap: 4,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 10,
                                color: isMe ? "rgba(255,255,255,0.6)" : "#94A3B8",
                            }}
                        >
                            {dayjs(item.createdAt).format("hh:mm A")}
                        </Text>

                        {isMe && (
                            <Ionicons
                                name={getStatusIcon()}
                                size={14}
                                color={getStatusColor()}
                            />
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export const RenderItem = MessageBubble;