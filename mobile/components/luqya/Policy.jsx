import React, { use } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const PolicyItem = ({ icon, title, description, iconColor = "#64748b" }) => (
  <View className="flex-row items-start mb-6">
    <View style={{ backgroundColor: iconColor + '15' }} className="p-2 rounded-lg">
      <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
    </View>
    <View className="ml-4 flex-1">
      <Text className="text-slate-900 font-bold text-base">{title}</Text>
      <Text className="text-slate-500 text-sm leading-5 mt-1">{description}</Text>
    </View>
  </View>
);

export default function PrivacyPolicyContent() {
  const { t } = useTranslation();
  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4">
      {/* Header */}
      <View className="mb-8 px-4">
        <Text className="text-2xl font-bold text-slate-900">{t("luqya_header_policy")}</Text>
        <Text className="text-slate-500 mt-2">
          {t("luqya_title_policy")}
        </Text>
      </View>

      {/* The 7-Day Rule Highlight */}
      <View className="bg-green-50 border border-green-100 p-5 rounded-3xl mb-8 flex-row items-center">
        <Feather name="shield" size={28} color="#16a34a" />
        <View className="ml-4 flex-1">
          <Text className="text-green-800 font-bold text-lg">{t("luqya_expire_message_days")}</Text>
          <Text className="text-green-700 text-sm">
            {t("luqya_expire_message")}
          </Text>
        </View>
      </View>

      {/* Permissions Section */}
      <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 ml-1">
        {t("luqya_permmission")}
      </Text>

      <PolicyItem
        icon="camera"
        title={t("luqya_permission_title")}
        description={t("luqya_permission_description")}
        iconColor="#8b5cf6"
      />

      <PolicyItem
        icon="microphone"
        title={t("luqya_permission_microphone")}
        description={t("luqya_permission_microphone_description")}
        iconColor="#ef4444"
      />

      <PolicyItem
        icon="bell-outline"
        title={t("luqya_permission_notification")}
        description={t("luqya_permission_notification_description")}
        iconColor="#f59e0b"
      />

      {/* Data Commitment */}
      <View className="mt-4 p-6 bg-slate-900 rounded-3xl mb-10">
        <Text className="text-white font-bold text-lg mb-2">{t("luqya_commitment")}</Text>
        <Text className="text-slate-400 text-sm leading-6">
          {t("luqya_commitment_description")}
        </Text>
      </View>
    </ScrollView>
  );
}