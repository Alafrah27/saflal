import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/Store';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const defaultImage = require('../../assets/images/person.png')
export default function UserProfile({ onPress, avatar }) {

    const { user } = useAuthStore();
    const { t } = useTranslation();
    const imageSource = user?.avatar
        ? { uri: user.avatar }
        : defaultImage;

    return (
        <View className="w-[95%] mx-auto ">


            <View className="flex-row items-center  px-4 gap-4 bg-white p-4 rounded-2xl relative "


            >

                <TouchableOpacity className="w-[70px] h-[70px]  rounded-full " onPress={onPress}>

                    <Image
                        source={imageSource}
                        className="w-full h-full rounded-full  overflow-hidden"
                        resizeMode='cover'

                    />
                    <TouchableOpacity className="absolute bottom-0 right-0" >
                        <Ionicons name="checkmark-circle" size={20} color="green" />
                    </TouchableOpacity>
                </TouchableOpacity>

                {/* 4. Reduced gap by removing extra View padding */}
                <View className="items-start mt-2">
                    <Text className="text-[16px] font-bold text-black capitalize leading-tight">
                        {t("username", { name: user?.FullName })}
                    </Text>
                    <Text className="text-[13px] font-medium text-slate-500 leading-tight">
                        {t("user_id", {
                            uuid: user?.uuid
                        })}
                    </Text>
                    <Text className="text-[13px] font-medium text-green-400 leading-tight">
                        online
                    </Text>
                </View>
            </View>
        </View>
    );
}