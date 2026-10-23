import { View, Text, TouchableOpacity, Image } from 'react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAcceptFriendRequest, useRejectFriendRequest } from '../../store/transtack/query';
import { getColorFromId } from '../../utils/getColorfromId';


export default function FetchRequestNotification({ item, online }) {
    const { t, i18n } = useTranslation();
    const sender = item?.sender;
    const bgColor = getColorFromId(sender?._id || "default");

    const { mutate: acceptRequest, isPending: isAccepting } = useAcceptFriendRequest();
    const { mutate: rejectRequest, isPending: isRejecting } = useRejectFriendRequest();

    const handleAccept = () => {
        if (item?._id) acceptRequest(item._id);
    };

    const handleReject = () => {
        if (item?._id) rejectRequest(item._id);
    };

    return (
        <View className="flex-row items-center py-5 px-2 bg-white border-b border-gray-100">
            <View style={{ width: 50, height: 50, borderRadius: 25, position: 'relative' }}>
                {sender?.avatar ? (
                    <Image
                        source={{ uri: sender.avatar }}
                        className="w-full h-full rounded-full overflow-hidden"
                        resizeMode="cover"
                    />
                ) : (
                    <View
                        style={{
                            width: 50,
                            height: 50,
                            borderRadius: 25,
                            backgroundColor: bgColor,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text className="text-white font-bold text-xl">
                            {sender?.FullName?.charAt(0)?.toUpperCase() || "?"}
                        </Text>
                    </View>
                )}
                {/* Online Indicator */}
                <View
                    className={`h-3 w-3 rounded-full absolute bottom-0 right-0 border-2 border-white ${online ? "bg-green-500" : "bg-gray-300"}`}
                />
            </View>

            <View className="ml-3 flex-1 ">
                <Text className="font-bold text-base">{sender?.FullName || "Unknown User"}</Text>

                <View className="flex-row mt-2 gap-2">
                    <TouchableOpacity
                        className="bg-blue-500 px-4 py-1 rounded-full"
                        onPress={handleAccept}
                        disabled={isAccepting || isRejecting}
                    >
                        <Text className="text-white text-sm font-semibold">
                            {isAccepting ? "..." : t(i18n.language === "en" ? "Confirm" : "قبول")}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-gray-200 px-4 py-1 rounded-full"
                        onPress={handleReject}
                        disabled={isAccepting || isRejecting}
                    >
                        <Text className="text-gray-700 text-sm font-semibold">
                            {isRejecting ? "..." : t(i18n.language === "en" ? "Delete" : "حذف")}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}