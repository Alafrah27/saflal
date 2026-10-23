import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ImageViewer() {
    const { url } = useLocalSearchParams();
    const router = useRouter();

    if (!url) {
        return (
            <SafeAreaView style={styles.container}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.imageContainer}>
                <Image 
                    source={{ uri: url }} 
                    style={styles.image} 
                    resizeMode="contain" 
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    }
});
