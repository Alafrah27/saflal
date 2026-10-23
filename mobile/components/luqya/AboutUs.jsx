import { View, Text, ScrollView } from 'react-native'
import React from 'react'
import { useTranslation } from 'react-i18next'

export default function AboutUs() {
    const { t } = useTranslation()
    return (
        <ScrollView

            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
        >
            <View className="flex-1 ">


                <View className="items-center mb-8">
                    <View className="w-20 h-20 bg-green-600 rounded-3xl items-center justify-center shadow-lg shadow-green-200">
                        {/* Replace with your actual Logo/Icon */}
                        <Text className="text-white text-4xl font-bold">{t("about_luqya_logo")}</Text>
                    </View>
                    <Text className="text-2xl font-bold text-slate-900 mt-4">{t("about_luqya_title")}</Text>
                    <Text className="text-slate-500 text-sm tracking-widest uppercase">{t("about_luqya")}</Text>
                </View>

                {/* Mission Section */}
                <View className="bg-slate-50 p-6 rounded-3xl mb-6">
                    <Text className="text-lg font-bold text-slate-800 mb-2">{t("about_luqya_mission")}</Text>
                    <Text className="text-slate-600 leading-6">
                        {t("about_luqya_mission_text")}
                    </Text>
                </View>

                {/* Developer Section */}
                <View className="px-2 mb-10">
                    <Text className="text-lg font-bold text-slate-800 mb-4">{t("about_luqya_developer")}</Text>
                    <View className="flex-row items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                        <View className="w-12 h-12 bg-slate-200 rounded-full items-center justify-center">
                            {/* You can use an Image here for your headshot */}
                            <Text className="text-slate-600 font-bold">{t("about_luqya_JD")}</Text>
                        </View>
                        <View className="ml-4 flex-1">
                            <Text className="text-slate-900 font-bold text-base">{t("about_luqya_JD_text")}</Text>
                            <Text className="text-slate-500 text-xs">{t("about_luqya_JD_text2")}</Text>
                        </View>
                    </View>

                    <Text className="text-slate-600 mt-4 leading-6 px-1">
                        {t("about_luqya_JD_text3")}
                    </Text>
                </View>

                {/* Footer Version */}
                <View className="items-center pb-10">
                    <Text className="text-slate-300 text-xs font-medium">{t("about_luqya_version")}</Text>
                    <Text className="text-slate-300 text-xs font-medium mt-1">{t("about_luqya_copyright")}</Text>
                </View>
            </View>
        </ScrollView>
    )
}