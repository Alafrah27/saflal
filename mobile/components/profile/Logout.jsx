import React, { useState } from 'react' // Added useState import
import { Text, TouchableOpacity, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/Store'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import ActionModal from '../CustomHookUi/ActionModel'

const LogoutPage = () => {
    const [visible, setVisible] = useState(false)
    const router = useRouter()
    const { t, i18n } = useTranslation()
    const { logout } = useAuthStore()

    const handleLogout = async () => {
        await logout()
        // Use replace to ensure the user can't go "back"
        router.replace("(auth)")
    }

    return (
        <View className="w-full px-4 mt-2">
            <TouchableOpacity
                onPress={() => setVisible(true)} // Open Modal instead of logging out immediately
                activeOpacity={0.7}
                className="flex-row items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm"
            >
                <View className="flex-row items-center gap-4">
                    <View className="w-10 h-10 bg-red-50 rounded-full items-center justify-center">
                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    </View>

                    <View>
                        <Text className="text-[16px] font-bold text-slate-800">
                            {t("setting_logout")}
                        </Text>
                        <Text className="text-[12px] text-slate-400 font-medium">
                            {t("logout_subtext", "See you again soon!")}
                        </Text>
                    </View>
                </View>

                <Ionicons
                    name={i18n.language === 'ar' ? "chevron-back" : "chevron-forward"}
                    size={18}
                    color="#cbd5e1"
                />
            </TouchableOpacity>

            {/* Reusable Action Modal */}
            <ActionModal
                visible={visible}
                onClose={() => setVisible(false)}
                title={t("logout_confirm_title", "Logout")}
                description={i18n.language === 'ar' ? "هل أنت متأكد من تسجيل الخروج؟" : "Are you sure you want to logout?"}
                actionLabel={t("setting_logout")}
                onHandleFn={handleLogout}
                isDangerous={false} // Uses your Gold brand color
                cancelLabel={i18n.language === 'ar' ? "إلغاء" : "Cancel"}
            />
        </View>
    )
}

export default LogoutPage