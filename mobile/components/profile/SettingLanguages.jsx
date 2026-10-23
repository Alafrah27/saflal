import { Text, TouchableOpacity, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'

const SettingLanguages = ({ onLangauageOpen }) => {
    const { t, i18n } = useTranslation()

    // Get current language name to display as a sub-label
    const currentLangLabel = i18n.language === 'ar' ? 'العربية' : 'English'

    return (
        <View className="w-full px-4 mb-2">
            <TouchableOpacity
                onPress={onLangauageOpen}
                activeOpacity={0.7}
                // flex-row and justify-between pushes the arrow to the far right
                className="flex-row items-center justify-between p-4 rounded-2xl bg-white shadow-sm border border-slate-50"
            >
                <View className="flex-row items-center gap-4">
                    {/* Language Icon Wrapper */}
                    <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center">
                        <Ionicons name="language-outline" size={20} color="#3b82f6" />
                    </View>

                    <View>
                        <Text className="text-[16px] font-bold text-slate-800">
                            {t("setting_language")}
                        </Text>
                        <Text className="text-[12px] text-slate-400 font-medium">
                            {currentLangLabel}
                        </Text>
                    </View>
                </View>

                {/* Right Chevron Arrow */}
                <Ionicons
                    name={i18n.language === 'ar' ? "chevron-back" : "chevron-forward"}
                    size={18}
                    color="#cbd5e1"
                />
            </TouchableOpacity>
        </View>
    )
}

export default SettingLanguages
