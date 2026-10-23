import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager, Platform } from "react-native";

const deviceLanguage = getLocales()[0]?.languageCode || "en";

const resources = {
  en: {
    translation: require("../local/en.json"),
  },
  ar: {
    translation: require("../local/ar.json"),
  },
};
const initI18n = async () => {
  let savedLng = null;
  if (Platform.OS !== "web" || typeof window !== "undefined") {
    try {
      savedLng = await AsyncStorage.getItem("lng");
    } catch (e) {}
  }
  const lng = savedLng || deviceLanguage || "en";

  const isRTL = lng === "ar";
  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
};

initI18n();
