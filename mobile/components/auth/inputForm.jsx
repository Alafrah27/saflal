import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';

import { useRouter, Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useContextProvider } from '../../context/LngContext';
import { useAuthStore } from '../../store/Store';
import BurntToastifY from '../CustomHookUi/BurntToatifY';
import AnimatedInput from '../ui/AnimatedInput';


const InputForm = () => {
    const [email, setEmail] = useState('');
    const [FullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const { t } = useTranslation();
    const { expoPushToken } = useContextProvider()
    const register = useAuthStore((state) => state.register);
    const isLoading = useAuthStore((state) => state.isLoading);
    const router = useRouter()
    const handleRegister = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

        if (!emailRegex.test(email)) return alert(t('invalid_email'));
        // if (!passwordRegex.test(password)) return alert(t('invalid_password'));
        if (!FullName || FullName.length < 3) return alert("Invalid Name");

        // 2. Data Preparation
        const data = {
            FullName,
            email,
            password,
            Expopushtoken: expoPushToken // Ensure this exists from your hook
        };

        // 3. Execution
        const result = await register(data);

        if (result.success) {
            BurntToastifY({
                title: "Registration has been  successfully",
                message: "Registration successful",
                preset: "done",
                type: "success"
            })
            router.replace("/(tabs)/chat");

        } else {
            // Show server error (e.g., "User already exists")
            alert(result.message);
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-300/50">
                <ActivityIndicator size="large" color="#b88144" />
            </View>
        );
    }

    return (
        <View className="flex-1  px-3  ">
            <View className=" flex-1 justify-center items-center">
                <AnimatedInput
                    icon="person-outline"
                    placeholder={t('input_name')}
                    value={FullName}
                    onChangeText={setFullName}
                    keyboardType="default"
                    index={0}
                />
                <AnimatedInput
                    icon="mail-outline"
                    placeholder={t('input_email')}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    index={1}
                />
                <AnimatedInput
                    icon="lock-closed-outline"
                    placeholder={t('input_password')}
                    value={password}
                    onChangeText={setPassword}
                    keyboardType="password"
                    isPassword={true}
                    index={2}
                />
            </View>


            <View className="mt-12   w-full space-y-10 justify-center items-center">
                <TouchableOpacity
                    disabled={isLoading}
                    onPress={handleRegister}
                    className="bg-[#b88144] w-full rounded-full py-4 px-10 flex-row items-center space-x-3 shadow-md mb-4">
                    <Text className="text-center text-black font-semibold text-lg flex-1">
                        {isLoading ? <ActivityIndicator color="#fff" /> : t('register_now')}

                    </Text>
                </TouchableOpacity>
                <Link href="/login" className="text-center text-xs text-slate-400 px-10 leading-5">
                    {t('ihaveaccount')}   <Text className="text-[#b88144]">{t('login_now')}</Text>
                </Link>
            </View>
        </View>
    );
};


// CRITICAL: This fixes the "Missing required default export" warning
export default InputForm;