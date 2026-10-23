import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { Entypo, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'

// 1. Accept two different props
export default function AboutUsandService({ onAboutPress, onContactPress }) {
    const { t } = useTranslation()
    return (
        <View className="w-[95%] mx-auto mt-7 mb-2 ">
            <View className="items-center px-4 gap-10 bg-white p-4 rounded-2xl relative ">

                {/* About Us Button */}
                <TouchableOpacity
                    onPress={onAboutPress} // Use the first prop
                    className="flex-row items-center justify-between w-full " >
                    <View className="flex-row items-center gap-2">
                        <MaterialCommunityIcons name="access-point-network" size={20} color="#b88144" />
                        <Text className="text-[13px] font-semibold text-black capitalize leading-tight">{t("about_us")}</Text>
                    </View>
                    <Entypo name={t("icon_setting")} size={24} color="black" />
                </TouchableOpacity>

                {/* Contact Us Button */}
                <TouchableOpacity
                    onPress={onContactPress} // Use the second prop
                    className="flex-row items-center justify-between w-full" >
                    <View className="flex-row items-center gap-2">
                        <MaterialIcons name="email" size={24} color="#b88144" />
                        <Text className="text-[13px] font-semibold text-black capitalize leading-tight">{t("contact_us")}</Text>
                    </View>
                    <Entypo name={t("icon_setting")} size={24} color="black" />
                </TouchableOpacity>

            </View>
        </View>
    )
}