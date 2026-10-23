import React, { useState } from 'react'; // Added React & useState
import { View, Text, TouchableOpacity } from 'react-native'; // Added missing imports
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // Added missing import
import ActionModal from '../CustomHookUi/ActionModel'; // Ensure spelling matches filename
import { useAuthStore } from '../../store/Store'; // Fixed comma to semicolon
import BurntToastifY from '../CustomHookUi/BurntToatifY'; // Ensure spelling matches

const DeleteAccount = () => {
    const [visible, setVisible] = useState(false);
    const { t, i18n } = useTranslation();
    const { deleteAccount } = useAuthStore();
    const router = useRouter();

    // ❌ REMOVED the useEffect that was auto-deleting the account!

    const handleDeleteAccount = async () => { // Added async
        const result = await deleteAccount();

        if (result.success) {
            BurntToastifY({
                title: t("deleted_success", "Account Deleted"),
                preset: "done",
                type: "success"
            });
            router.replace("/(auth)");
        } else {
            alert(result.message);
        }
    };

    return (
        <View className="w-full px-4 mt-4 mb-6">
            <TouchableOpacity
                onPress={() => setVisible(true)}
                activeOpacity={0.7}
                className="flex-row items-center justify-between p-4 rounded-2xl bg-red-50/30 border border-red-100"
            >
                <View className="flex-row items-center gap-4">
                    <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center">
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </View>

                    <View>
                        <Text className="text-[16px] font-bold text-red-600">
                            {t("setting_delete_account")}
                        </Text>
                        <Text className="text-[11px] text-red-400 font-medium">
                            {t("delete_account_warning", "This action cannot be undone")}
                        </Text>
                    </View>
                </View>

                <Ionicons
                    name={i18n.language === 'ar' ? "chevron-back" : "chevron-forward"}
                    size={18}
                    color="#fca5a5"
                />
            </TouchableOpacity>

            <ActionModal
                visible={visible}
                onClose={() => setVisible(false)}
                title={t("setting_delete_account")}
                description={i18n.language === 'ar' ? "هل أنت متأكد من حذف حسابك؟" : "Are you sure you want to delete your account?"}
                onHandleFn={handleDeleteAccount} // Fixed: passing the function directly
                actionLabel={t("setting_delete_account")}
                isDangerous={true}
                cancelLabel={i18n.language === 'ar' ? "الغاء" : "Cancel" }
            />
        </View>
    );
};

export default DeleteAccount;