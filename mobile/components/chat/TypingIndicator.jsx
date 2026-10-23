import { View, Text } from "react-native";
import React, { useEffect, useRef } from "react";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    withDelay,
    withSequence,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

const Dot = ({ delay }) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: 400 }),
                    withTiming(0.3, { duration: 400 })
                ),
                -1,
                false
            )
        );
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                {
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#b88144",
                    marginHorizontal: 2,
                },
                animStyle,
            ]}
        />
    );
};

export default function TypingIndicator() {
    const { i18n } = useTranslation();
    const isRTL = i18n.language === "ar";

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 6,
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F1F5F9",
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    borderBottomLeftRadius: 4,
                }}
            >
                <Dot delay={0} />
                <Dot delay={200} />
                <Dot delay={400} />
            </View>
        </View>
    );
}
