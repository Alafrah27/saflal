import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/Store";
import { useSendFriendRequest } from "../../store/transtack/query";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { getColorFromId } from "../../utils/getColorfromId";





export default function FetchUsers({ item, online }) {
    const router = useRouter();
    const bgColor = getColorFromId(item._id);
    const { t, i18n } = useTranslation();

    // Mutates
    const { mutate: sendRequest, isPending } = useSendFriendRequest();
    // Assuming you have or will create a useUnfriend hook
    // const { mutate: unfriend, isPending: isUnfriending } = useUnfriend(); 

    const [requestSent, setRequestSent] = useState(false);

    const user = useAuthStore((state) => state?.user);

    // Ensure we are checking the array correctly
    const isFriend = useMemo(() => {
        return user?.friends?.some(friendId =>
            (typeof friendId === 'string' ? friendId : friendId._id) === item._id
        );
    }, [user?.friends, item._id]);

    const handleSendRequest = () => {
        sendRequest(item._id, {
            onSuccess: () => setRequestSent(true),
            onError: (error) => {
                BurntToastifY({
                    title: "Error",
                    message: error?.message,
                    preset: "error",
                    type: "error",
                });
            }
        });
    }

    const handleUnfriend = () => {
        // Call your unfriend API here
        console.log("Unfriending user:", item._id);
    }

    const handleChatIdMessage = () => {
        router.push({
            pathname: "/chat/[id]",
            params: { 
                id: item?._id, 
                name: item?.FullName, 
                avatar: item?.avatar,
                userId: item?._id 
            },
        });
    }

    return (
        <View className="flex-row items-center justify-between py-4 px-3 bg-white border-b border-gray-100">
            {/* Avatar & Name Section */}
            <View className="flex-row items-center flex-1">
                <View className="relative" style={{ width: 50, height: 50, borderRadius: 25 }}>
                    {item?.avatar ? (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push({ pathname: "/imageView", params: { url: item.avatar } })}
                        >
                            <Image source={{ uri: item.avatar }} className="w-full h-full rounded-full overflow-hidden" resizeMode='cover' style={{ width: 50, height: 50, borderRadius: 25 }} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: bgColor, alignItems: "center", justifyContent: "center" }}>
                            <Text
                            numberOfLines={1}
                             className="text-white font-bold text-xl">{item?.FullName?.charAt(0)?.toUpperCase()}</Text>
                        </View>
                    )}
                    <View className={`h-3 w-3 ${online ? "bg-green-500" : "bg-gray-300"} rounded-full absolute bottom-0 right-0 border-2 border-white`} />
                </View>

                <View className="ml-3 flex-1">
                    <Text className="font-bold text-base text-gray-800" numberOfLines={1}>{item?.FullName}</Text>
                </View>
            </View>

            {/* Action Buttons Section */}
            <View className="flex-row items-center gap-2 ml-2">
                {isFriend ? (
                    <>
                        <TouchableOpacity
                            onPress={handleChatIdMessage}
                            className="bg-[#b88144]/15 w-10 h-10 items-center justify-center rounded-full"
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chatbubble-ellipses" size={20} color="#b88144" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-red-50 border border-red-100 w-10 h-10 items-center justify-center rounded-full"
                            activeOpacity={0.7}
                            onPress={handleUnfriend}
                        >
                            <Ionicons name="person-remove" size={18} color="#ef4444" />
                        </TouchableOpacity>
                    </>
                ) : requestSent ? (
                    <View className="bg-gray-100 border border-gray-200 w-10 h-10 items-center justify-center rounded-full">
                        <Ionicons name="time" size={20} color="#6b7280" />
                    </View>
                ) : (
                    <TouchableOpacity
                        className="bg-blue-50 border border-blue-100 w-10 h-10 items-center justify-center rounded-full"
                        activeOpacity={0.7}
                        onPress={handleSendRequest}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <ActivityIndicator size="small" color="#3b82f6" />
                        ) : (
                            <Ionicons name="person-add" size={18} color="#3b82f6" />
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}