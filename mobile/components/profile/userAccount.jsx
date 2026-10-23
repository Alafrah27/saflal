import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { Entypo, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next';


export default function UserAccount({ onPress }) {
    const { t } = useTranslation()
    const router = useRouter()
    return (
        <View className="w-[95%] mx-auto mt-7 mb-2 ">
            <Text className="text-[12px] font-bold text-slate-500 capitalize leading-tight mb-2">

                {t("user_account")}
            </Text>
            <View className=" items-center  px-4 gap-10 bg-white p-4 rounded-2xl relative ">
                <TouchableOpacity
                    onPress={onPress}
                    className="flex-row items-center justify-between w-full " >
                    <View className="flex-row items-center gap-2">
                        <Ionicons name="person" size={19} color="#b88144" />
                        <Text className="text-[13px] font-semibold text-black capitalize leading-tight">{t("user_update_account")}</Text>
                    </View>
                      <Entypo name={t("icon_setting")} size={24} color="black" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => router.push("accountsetting")}
                    className="flex-row items-center justify-between w-full" >
                    <View className="flex-row items-center gap-2">
                        <Ionicons name="settings" size={19} color="#b88144" />
                        <Text className="text-[13px] font-semibold text-black capitalize leading-tight">{t("user_settings")}</Text>
                    </View>
                      <Entypo name={t("icon_setting")} size={24} color="black" />
                </TouchableOpacity>
            </View>
        </View>
    )
}