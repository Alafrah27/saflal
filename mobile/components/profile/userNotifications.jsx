import { View, Text, TouchableOpacity, Animated, Pressable } from 'react-native'
import React, { useEffect, useRef } from 'react'
import { Entypo, Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next';
import { SocketIoStore } from '../../store/socketioStore';

/* ── Premium Custom Toggle Switch ── */
function CustomSwitch({ value, onToggle }) {
    const translateX = useRef(new Animated.Value(value ? 22 : 2)).current;
    const bgAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateX, {
                toValue: value ? 22 : 2,
                useNativeDriver: true,
                tension: 60,
                friction: 8,
            }),
            Animated.timing(bgAnim, {
                toValue: value ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    }, [value]);

    const trackColor = bgAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#E2E8F0', '#b88144'],
    });

    return (
        <Pressable onPress={onToggle} hitSlop={8}>
            <Animated.View
                style={{
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: trackColor,
                    justifyContent: 'center',
                    paddingHorizontal: 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                }}
            >
                <Animated.View
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: '#fff',
                        transform: [{ translateX }],
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 3,
                        elevation: 4,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Ionicons
                        name={value ? "checkmark" : "close"}
                        size={14}
                        color={value ? "#b88144" : "#CBD5E1"}
                    />
                </Animated.View>
            </Animated.View>
        </Pressable>
    );
}

export default function UserNotifications({ onPrivacyPress }) {
    const { t } = useTranslation();
    const notificationsEnabled = SocketIoStore((s) => s.notificationsEnabled);
    const toggleNotifications = SocketIoStore((s) => s.toggleNotifications);
    const loadNotificationSetting = SocketIoStore((s) => s.loadNotificationSetting);

    // Load saved preference on mount
    useEffect(() => {
        loadNotificationSetting();
    }, []);

    return (
        <View className="w-[95%] mx-auto mt-7 mb-2 ">
            <Text className="text-[12px] font-bold text-slate-500 capitalize leading-tight mb-2">{t("user_notifiation_policy")}</Text>
            <View className=" items-center  px-4 gap-10 bg-white p-4 rounded-2xl relative ">
                <TouchableOpacity
                    onPress={onPrivacyPress}
                    className="flex-row items-center justify-between w-full " >
                    <View className="flex-row items-center gap-2">
                        <MaterialIcons name="privacy-tip" size={20} color="#b88144" />
                        <Text className="text-[13px] font-semibold text-black capitalize leading-tight">{t("user_privacy_policy")}</Text>
                    </View>
                    <Entypo name="chevron-small-left" size={24} color="black" />
                </TouchableOpacity>

                {/* Notification Toggle */}
                <View className="flex-row items-center justify-between w-full">
                    <View className="flex-row items-center gap-2">
                        <View style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            backgroundColor: notificationsEnabled ? '#b8814415' : '#94A3B815',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Ionicons
                                name={notificationsEnabled ? "notifications" : "notifications-off-outline"}
                                size={17}
                                color={notificationsEnabled ? "#b88144" : "#94A3B8"}
                            />
                        </View>
                        <View>
                            <Text className="text-[13px] font-semibold text-black capitalize leading-tight">{t("user_notification")}</Text>
                            <Text style={{
                                fontSize: 10,
                                color: notificationsEnabled ? '#22C55E' : '#94A3B8',
                                marginTop: 1,
                                fontWeight: '500',
                            }}>
                                {notificationsEnabled
                                    ? (t("notification_on") || "On")
                                    : (t("notification_off") || "Off")}
                            </Text>
                        </View>
                    </View>
                    <CustomSwitch value={notificationsEnabled} onToggle={toggleNotifications} />
                </View>
            </View>
        </View>
    )
}