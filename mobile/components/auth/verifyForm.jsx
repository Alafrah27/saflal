
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useRouter } from 'expo-router';
import { useContextProvider } from '../../context/LngContext';
import { useAuthStore } from '../../store/Store';
import AnimatedInput from '../ui/AnimatedInput';

export default function Login() {
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { expoPushToken } = useContextProvider();
    const login = useAuthStore((state) => state.login);
    const isLoading = useAuthStore((state) => state.isLoading);
    const handleLogin = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

        if (!emailRegex.test(email)) return alert(t('invalid_email'));
        // if (!passwordRegex.test(password)) return alert(t('invalid_password'));

        const data = {
            email,
            password,
            Expopushtoken: expoPushToken

        };

        console.log(data);
        const result = await login(data);

        if (result.success) {
            // Redirect to home or chat screen
            router.replace("/(tabs)/chat");
        } else {
            // Show server error (e.g., "User already exists")
            alert(result.message);
        }
    }


    return (
        <View className="flex-1 px-3">

            <View className="flex-1 items-center justify-center">

                <AnimatedInput
                    icon="mail-outline"
                    placeholder={t('input_email')}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    index={0}
                />
                <AnimatedInput
                    icon="lock-closed-outline"
                    placeholder={t('input_password')}
                    value={password}
                    onChangeText={setPassword}
                    keyboardType="password"
                    isPassword={true}
                    index={1}
                />
            </View>


            <View className="mt-10  w-full space-y-10 justify-center items-center">
                <TouchableOpacity
                    disabled={isLoading}
                    onPress={handleLogin}
                    className="bg-[#b88144] w-full rounded-full py-4 px-10 flex-row items-center space-x-3 shadow-md mb-4">
                    <Text className="text-center text-black font-semibold text-lg flex-1">
                        {
                            isLoading ? <ActivityIndicator color="#fff" /> : t('login_now')
                        }
                    </Text>
                </TouchableOpacity>
                <Link href="/register" className="text-center text-xs text-slate-400 px-10 leading-5">
                    {i18n.language === "ar" ? "ليس لديك حساب؟" : "Don't have an account?"} <Text className="text-[#b88144] font-semibold">{i18n.language === "ar" ? "انشاء حساب" : "Sign Up"}</Text>
                </Link>
            </View>
        </View>

    )
}