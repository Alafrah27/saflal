import { View, Text } from "react-native";
import React from "react";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import { useTranslation } from "react-i18next";

dayjs.extend(isToday);
dayjs.extend(isYesterday);

export default function DateSeparator({ date }) {
    const { i18n } = useTranslation();
    const isRTL = i18n.language === "ar";

    const d = dayjs(date);
    let label;

    if (d.isToday()) {
        label = isRTL ? "اليوم" : "Today";
    } else if (d.isYesterday()) {
        label = isRTL ? "أمس" : "Yesterday";
    } else {
        label = d.format("MMM D, YYYY");
    }

    return (
        <View
            style={{
                alignItems: "center",
                paddingVertical: 12,
            }}
        >
            <View
                style={{
                    backgroundColor: "#E2E8F0",
                    paddingHorizontal: 14,
                    paddingVertical: 5,
                    borderRadius: 12,
                }}
            >
                <Text
                    style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#64748B",
                    }}
                >
                    {label}
                </Text>
            </View>
        </View>
    );
}
