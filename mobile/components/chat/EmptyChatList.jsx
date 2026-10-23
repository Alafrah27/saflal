import { View, Text } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

export default function EmptyChatList() {
    const { i18n } = useTranslation();
    const isRTL = i18n.language === "ar";

    return (
        <View
            style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 40,
                paddingTop: 80,
            }}
        >
            <View
                style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: "#FEF3C7",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 24,
                }}
            >
                <Ionicons name="chatbubbles-outline" size={48} color="#b88144" />
            </View>

            <Text
                style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: "#1E293B",
                    marginBottom: 8,
                    textAlign: "center",
                }}
            >
                {isRTL ? "لا توجد محادثات بعد" : "No conversations yet"}
            </Text>

            <Text
                style={{
                    fontSize: 14,
                    color: "#94A3B8",
                    textAlign: "center",
                    lineHeight: 22,
                }}
            >
                {isRTL
                    ? "أضف أصدقاء وابدأ المحادثة معهم"
                    : "Add friends and start chatting with them"}
            </Text>
        </View>
    );
}
