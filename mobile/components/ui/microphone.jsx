import 'react-native-gesture-handler';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';

export default function Microphone() {
    const pressed = useSharedValue(false);
    const offset = useSharedValue(0);

    const pan = Gesture.Pan()
        .onBegin(() => {
            pressed.value = true;
        })
        .onChange((event) => {
            // Adjust translation based on RTL if needed, but standard is translateX
            offset.value = event.translationX;
        })
        .onFinalize(() => {
            offset.value = withSpring(0);
            pressed.value = false;
        });

    const animatedStyles = useAnimatedStyle(() => ({
        transform: [
            { translateX: offset.value },
            // Scale increases when pressed (simulating hover effect on mobile)
            { scale: withSpring(pressed.value ? 1.9 : 1) },

        ],
        backgroundColor: pressed.value ? 'red' : '#b88144',
    }));

    return (
        /* Removed flex:1 from container to stop it from taking over the screen */
        <View className=''>
            <GestureDetector gesture={pan}>
                <Animated.View style={[styles.circle, animatedStyles]}>
                    <Ionicons name="mic" size={24} color="white" />
                </Animated.View>
            </GestureDetector>
        </View>

    );
}

const styles = StyleSheet.create({

    circle: {
        height: 50,
        width: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow for a better look
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,


    },

});