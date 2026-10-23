import { View, Text, TouchableOpacity, Share, Platform } from 'react-native'
import React from 'react'
import { Entypo, MaterialIcons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'



export default function ShareAndSupport() {
    const { t } = useTranslation()

    const onShare = async () => {
        try {
            const androidUrl = 'https://play.google.com/store/apps/details?id=luqya.notification';
            // Note: replace the iOS URL with your actual App Store link / ID when available
            const iosUrl = 'https://apps.apple.com/app/luqya/idYOUR_APP_STORE_ID';

            const storeUrl = Platform.OS === 'ios' ? iosUrl : androidUrl;
            const message = `Check out Luqya! Download the app now:\n${storeUrl}`;

            await Share.share({
                message: message,
                url: storeUrl,
                title: 'Share Luqya'
            });
        } catch (error) {
            console.error(error.message);
        }
    };

    return (
        <View className="w-[95%] mx-auto mt-7 mb-2 ">
            <View className=" items-center  px-4 gap-10 bg-white p-4 rounded-2xl relative ">

                <TouchableOpacity className="flex-row items-center justify-between w-full" onPress={onShare}>
                    <View className="flex-row items-center gap-2">
                        <MaterialIcons name="share" size={20} color="#b88144" />
                        <Text className="text-[13px] font-semibold text-black capitalize leading-tight">{t("share_luqya")}</Text>
                    </View>
                    <Entypo name={t("icon_setting")} size={24} color="black" />
                </TouchableOpacity>
            </View>
        </View>
    )
}