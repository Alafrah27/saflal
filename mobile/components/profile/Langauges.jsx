import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useContextProvider } from '../../context/LngContext'
import LanguageRestartModal from '../CustomHookUi/LoadingLng'
import { Ionicons } from '@expo/vector-icons'

const Languages = () => {
    const { t, i18n } = useTranslation()
    const { changeLanguage, loading } = useContextProvider()

    // Current active language from i18n
    const currentLng = i18n.language;


    const languages = [
        { id: 'en', label: `${t("select_language_english")}`, native: 'English' },
        { id: 'ar', label: `${t("select_language_arabic")}`, native: 'العربية' },

    ];

    if (loading) return <LanguageRestartModal />

    return (
        <ScrollView
            className="flex-1 px-5 py-4 bg-white"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
        >
            <View className="mb-6">
                <Text className="text-2xl font-bold text-slate-800 text-center">
                    {t("select_language")}
                </Text>
                <Text className="text-slate-400 text-center mt-1">
                    {t("langauge_title")}
                </Text>
            </View>

            <View className="space-y-3 gap-3">
                {languages.map((lang) => {
                    const isSelected = currentLng === lang.id;

                    return (
                        <TouchableOpacity
                            key={lang.id}
                            onPress={() => changeLanguage(lang.id)}
                            // Dynamic styling based on selection
                            className={`flex-row items-center justify-between p-5 rounded-2xl border-2 ${!isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-slate-50'
                                }`}
                        >
                            <View>
                                <Text className={`text-lg font-bold ${isSelected ? 'text-blue-600' : 'text-slate-700'}`}>
                                    {lang.label}
                                </Text>
                                <Text className="text-slate-400 text-sm">{lang.native}</Text>
                            </View>

                            {/* This is your "Checked Input" */}
                            <View className={`w-6 h-6 rounded-full items-center justify-center border-2 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'
                                }`}>
                                {isSelected && (
                                    <Ionicons name="checkmark" size={16} color="white" />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    )
}

export default Languages