import { View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import { useGetNotifications } from "../../store/transtack/query";
import FetchRequestNotification from "../../components/users/fetchRequestNotification";
import { useCallback, useState, useMemo, useEffect } from "react";
import { SocketIoStore } from "../../store/socketioStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Notification() {
    const [refreshing, setRefreshing] = useState(false);
    const [localCache, setLocalCache] = useState([]);
    const [cacheLoaded, setCacheLoaded] = useState(false); // New: Track if cache is ready

    const onlineUsersRaw = SocketIoStore((state) => state?.onlineUsers);
    const onlineUsers = useMemo(() => Array.isArray(onlineUsersRaw) ? onlineUsersRaw : [], [onlineUsersRaw]);

    const { data: notification, refetch, error, isLoading, isFetching, isSuccess } = useGetNotifications();

    // 1. Load Cache on Mount
    useEffect(() => {
        const loadCache = async () => {
            try {
                const cached = await AsyncStorage.getItem("notification_cache");
                if (cached) setLocalCache(JSON.parse(cached));
            } finally {
                setCacheLoaded(true); // Always set true so we can stop showing the spinner
            }
        };
        loadCache();
    }, []);

    // 2. Save Server Data to Cache when successful
    useEffect(() => {
        if (isSuccess && notification) {
            AsyncStorage.setItem("notification_cache", JSON.stringify(notification));
        }
    }, [isSuccess, notification]);

    // 3. Smart Data Selection
    const safeData = useMemo(() => {
        // If we have fresh server data, use it
        if (notification) return notification;
        // If we are loading/errored but have cache, use it
        if (localCache.length > 0) return localCache;
        return [];
    }, [notification, localCache]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // UI STATES
    // Only show big spinner if we have NO cache and we are loading for the first time
    if (!cacheLoaded || (isLoading && safeData.length === 0)) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#b88144" />
                <Text className="mt-2 text-gray-500">Connecting...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Show error toast instead of full screen if we have cached data */}
            {error && safeData.length > 0 && (
                <View className="bg-red-100 p-2">
                    <Text className="text-red-600 text-center text-xs">Offline: showing cached requests</Text>
                </View>
            )}

            {/* Full screen error ONLY if no data at all */}
            {error && safeData.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                    <Text className="text-red-500 font-semibold">Could not connect to server</Text>
                    <TouchableOpacity onPress={() => refetch()} className="mt-4 p-2 bg-[#b88144] rounded">
                        <Text className="text-white">Retry Connection</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View className="flex-1">
                    {isFetching && !refreshing && (
                        <View className="absolute top-0 left-0 right-0 z-10 bg-[#b88144]/10 py-1">
                            <Text className="text-center text-[10px] text-[#b88144]">Syncing...</Text>
                        </View>
                    )}

                    <FlatList
                        data={safeData}
                        keyExtractor={(item) => item?._id?.toString()}
                        renderItem={({ item }) => (
                            <FetchRequestNotification
                                item={item}
                                online={onlineUsers.includes(item?.sender?._id)}
                            />
                        )}
                        ListEmptyComponent={
                            <View className="flex-1 items-center justify-center py-20">
                                <Text className="text-gray-500 text-base">No new friend requests</Text>
                            </View>
                        }
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#b88144"]} />
                        }
                    />
                </View>
            )}
        </View>
    );
}