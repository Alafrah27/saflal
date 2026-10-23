import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/Store'
import BurntToastifY from '../CustomHookUi/BurntToatifY'

export default function UpdateUserProfile() {
    const { user, updateUser, isLoading } = useAuthStore()
    const { t, i18n } = useTranslation()

    // Initialize state with existing user data
    const [fullName, setFullName] = useState(user?.FullName || "")
    // const [password, setPassword] = useState("")

    const handleUpdate = async () => {
        // Validation: Don't send empty strings if not required
        const updateData = { FullName: fullName };
        // if (password.length > 0) updateData.password = password;

        const result = await updateUser(updateData);

        if (result?.success) {
            BurntToastifY({
                title: t("update_success_title", "Success"),
                message: t("update_success_msg", "Profile updated successfully"),
                preset: "done",
                type: "success"
            })
        } else {
            alert(result?.message || "Error updating profile");
        }
    }

    return (
        <View className="flex-1 px-4 py-2">
            <Text className="text-center font-bold text-2xl mb-6 text-slate-800">
                {t("user_update_profile")}
            </Text>

            <View className="gap-4">
                <View>
                    <Text className="text-xs text-slate-500 mb-1 ml-2">{i18n.language === "en" ? "Full Name" : "الاسم الكامل"}</Text>
                    <TextInput
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Your Name"
                        className="bg-gray-100 rounded-2xl px-4 py-4 text-black"
                    />
                </View>

                <View>
                    <Text className="text-xs text-slate-500 mb-1 ml-2">{i18n.language === "ar" ? "البريد الالكتروني" : "Email (Permanent)"}</Text>
                    <TextInput
                        value={user?.email}
                        editable={false}
                        className="bg-gray-50 rounded-2xl px-4 py-4 text-slate-400"
                    />
                </View>

                <View>
                    <Text className="text-xs text-slate-500 mb-1 ml-2">{i18n.language === "en" ? "New Password (Optional)" : "كلمة المرور الجديدة (اختياري)" }</Text>
                    <TextInput
                        // value={password}
                        // onChangeText={setPassword}
                        placeholder="Leave blank to keep current"
                        secureTextEntry
                        className="bg-gray-100 rounded-2xl px-4 py-4 text-black"
                    />
                </View>

                <Pressable
                    onPress={handleUpdate}
                    disabled={isLoading}
                    className={`rounded-2xl py-4 items-center justify-center mt-4 ${isLoading ? 'bg-gray-400' : 'bg-[#b88144]'}`}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">
                            {t("user_update_button")}
                        </Text>
                    )}
                </Pressable>
            </View>
        </View>
    )
}