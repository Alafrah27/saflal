import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const AnimatedInput = ({
    icon,
    placeholder,
    value,
    onChangeText,
    secureTextEntry = false,
    keyboardType = 'default',
    index = 0,
    isPassword = false,
}) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const { i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 150).duration(600).springify()}
            className="flex-row w-full bg-gray-50 border border-slate-200 rounded-full px-4 py-3 items-center mb-5 gap-3"
        >
            <Ionicons name={icon} size={20} color="#b88144" />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                keyboardType={keyboardType}
                secureTextEntry={isPassword ? !isPasswordVisible : secureTextEntry}
                style={{ textAlign: isRTL ? 'right' : 'left' }}
                className="flex-1 py-2 shrink placeholder:text-slate-400 placeholder:text-sm"
            />
            {isPassword && (
                <Ionicons
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                    name={isPasswordVisible ? "eye-off" : "eye"}
                    size={20}
                    color="#b88144"
                />
            )}
        </Animated.View>
    );
};

export default AnimatedInput;
