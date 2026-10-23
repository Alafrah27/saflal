import { Alert, View, Text, Image, Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Trans, useTranslation } from "react-i18next";
import { AuthButton } from "../../components/auth/AuthControls";
import { websiteLinks } from "../../shared/websiteLinks";

export default function Wellcome() {
    const router = useRouter();
    const { t } = useTranslation();
    const handleRoute = () => {
        router.push("/(auth)/login");
    };
    const openLegalLink = async (url) => {
        try {
            await Linking.openURL(url);
        } catch {
            Alert.alert(t("app_name"), t("welcome_link_error"));
        }
    };
    return (
        <SafeAreaView className="flex-1 bg-gray-300/50">
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: "space-between", gap: 32 }}>

                {/* 🔹 TOP / HERO */}
                <View className="items-center mt-10">
                    <Image
                        source={require("@/assets/images/icon.png")}
                        className="w-[180px] h-[180px] rounded-full"
                    />

                    <Text className="text-3xl font-extrabold text-black">
                        {t('app_name')}
                    </Text>
                    <Text className="text-center text-slate-500 mt-3 text-base leading-6 px-4 font-medium">
                        {t('app_description')}
                    </Text>
                </View>

                {/* 🔹 BOTTOM / ACTION */}
                <View className="mb-10" style={{ gap: 16 }}>
                    <AuthButton title={t("start_button")} onPress={handleRoute} />

                    <Text className="text-center text-xs text-slate-500 px-6 leading-5">
                        <Trans i18nKey="welcome_legal" components={{
                            terms: <Text accessibilityRole="link" onPress={() => openLegalLink(websiteLinks.terms)} style={{ color: "#2563eb", textDecorationLine: "underline" }} />,
                            privacy: <Text accessibilityRole="link" onPress={() => openLegalLink(websiteLinks.privacy)} style={{ color: "#2563eb", textDecorationLine: "underline" }} />,
                        }} />
                    </Text>
                    <Text accessibilityRole="link" onPress={() => openLegalLink(websiteLinks.about)}
                        style={{ textAlign: "center", color: "#2563eb", textDecorationLine: "underline", fontSize: 12, paddingVertical: 8 }}>
                        {t("about_saflal")}
                    </Text>

                </View>

            </ScrollView>
        </SafeAreaView>
    );
}


