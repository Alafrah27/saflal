import React from 'react';
import { View, Text, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function ContactUs() {
    const email = "luqya@gmail.com" || "almusdarthafa@999gmail.com";
    const { t } = useTranslation()

    const handleEmailPress = () => {
        Linking.openURL(`mailto:${email}`);
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false}
            style={{ flexGrow: 1 }}
            className="flex-1 px-3">


            <View className="flex-1">
                {/* Header */}
                <View className="mb-8 px-3">
                    <Text className="text-2xl font-bold text-slate-900">{t("contact_luqya_header")}</Text>
                    <Text className="text-slate-500 mt-2 leading-5">
                        {t("contact_luqya_title")}
                    </Text>
                </View>

                {/* Primary Contact Card */}
                <View className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-6">
                    <View className="flex-row items-center mb-4">
                        <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
                            <MaterialIcons name="support-agent" size={22} color="#16a34a" />
                        </View>
                        <Text className="ml-3 text-lg font-bold text-slate-800">{t("contact_luqya_support")}</Text>
                    </View>

                    <Text className="text-slate-600 mb-4 leading-6">
                        {t("contact_luqya_support_title")}
                    </Text>

                    <TouchableOpacity
                        onPress={handleEmailPress}
                        className="bg-white border border-slate-200 p-4 rounded-2xl flex-row items-center justify-between"
                    >
                        <View className="flex-row items-center">
                            <Ionicons name="mail-outline" size={20} color="#64748b" />
                            <Text className="ml-3 text-slate-700 font-medium">{email}</Text>
                        </View>
                        <Ionicons name="copy-outline" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                </View>

                {/* Developer Identity Section */}
                <View className="px-5">
                    <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">{t("contact_luqya_developer")}</Text>
                    <View className="flex-row items-center">
                        <View className="w-14 h-14 bg-slate-900 rounded-2xl items-center justify-center">
                            <Text className="text-white font-bold text-xl">{t("contact_latter")}</Text>
                        </View>
                        <View className="ml-4">
                            <Text className="text-lg font-bold text-slate-900">{t("contact_luqya_name")}</Text>
                            <Text className="text-green-600 font-medium text-sm">{t("contact_luqya_nikename")}</Text>
                        </View>
                    </View>
                    <Text className="text-slate-500 mt-4 leading-6 italic">
                        {t("contact_luqya_response")}
                    </Text>
                </View>

                {/* Social/Web Hint */}
                <View className="mt-auto pt-10 items-center">
                    <Text className="text-slate-400 text-xs">{t("contact_luqya_response_time")}</Text>
                </View>
            </View>
        </ScrollView>
    );
}