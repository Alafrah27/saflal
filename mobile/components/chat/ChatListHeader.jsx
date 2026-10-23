import { View, Text, TextInput } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const MAIN_COLOR = "#b88144";

export default function ChatListHeader({ searchQuery, onSearchChange }) {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === "ar";

    return (
        <View style={{ backgroundColor: MAIN_COLOR, paddingBottom: 12, paddingHorizontal: 16 }}>
            {/* Search bar */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    height: 42,
                }}
            >
                <Ionicons name="search" size={18} color="rgba(255,255,255,0.7)" />
                <TextInput
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    placeholder={isRTL ? "ابحث في المحادثات..." : "Search chats..."}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={{
                        flex: 1,
                        marginLeft: 8,
                        color: "#fff",
                        fontSize: 14,
                        textAlign: isRTL ? "right" : "left",
                    }}
                />
                {searchQuery?.length > 0 && (
                    <Ionicons
                        name="close-circle"
                        size={18}
                        color="rgba(255,255,255,0.7)"
                        onPress={() => onSearchChange("")}
                    />
                )}
            </View>
        </View>
    );
}
