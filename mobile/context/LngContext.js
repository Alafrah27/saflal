import { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { I18nManager, Platform } from "react-native";
import { reloadAppAsync } from "expo";
import { registerForPushNotificationsAsync } from "../utils/registerForPushNotificationsAsync";
import { changeAppLanguage } from "../lib/changeAppLanguage";
import { useCallStore } from "../store/callStore";

const lngcontext = createContext();

const LngProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [error, setError] = useState(null);
  const { i18n } = useTranslation();
  const changingLanguage = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem("saflal_expo_push_token").then((cached) => {
      if (cached) setExpoPushToken(cached);
    }).catch(() => {});

    registerForPushNotificationsAsync()
      .then((token) => {
        setExpoPushToken(token);
        if (token) AsyncStorage.setItem("saflal_expo_push_token", token).catch(() => {});
      })
      .catch((err) => setError(err));
  }, []);

  const changeLanguage = async (lng) => {
    if (changingLanguage.current) return;
    if (lng === i18n.language) return;
    changingLanguage.current = true;
    setLoading(true);
    try {
      // Let the loading UI paint before a fast storage update triggers a restart.
      await new Promise(resolve => setTimeout(resolve, 400));
      await changeAppLanguage({ language: lng, i18n, storage: AsyncStorage, layout: I18nManager,
        reload: reloadAppAsync, native: Platform.OS !== "web", hasActiveCall: useCallStore.getState().callState !== "idle" });
    } finally {
      changingLanguage.current = false;
      setLoading(false);
    }
  };
  return (
    <lngcontext.Provider
      value={{
        changeLanguage,
        loading,
        expoPushToken,
        error,
      }}
    >
      {children}
    </lngcontext.Provider>
  );
};

const useContextProvider = () => {
  const context = useContext(lngcontext);
  if (context === undefined) {
    throw new Error("useContext must be inside a Provider with a value");
  }
  return context;
};

export { LngProvider, useContextProvider };
