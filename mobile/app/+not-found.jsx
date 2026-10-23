import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function NotFoundScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 items-center justify-center bg-white px-6">
            <Ionicons name="alert-circle-outline" size={80} color="#d1d5db" />
            <Text className="text-2xl font-bold text-gray-800 mt-4">Page Not Found</Text>
            <Text className="text-gray-500 text-center mt-2">
                The page you're looking for doesn't exist or has been moved.
            </Text>
            <TouchableOpacity
                onPress={() => router.replace('/')}
                className="bg-[#b88144] px-8 py-3 rounded-full mt-6"
                activeOpacity={0.8}
            >
                <Text className="text-white font-semibold">Go Home</Text>
            </TouchableOpacity>
        </View>
    );
}
