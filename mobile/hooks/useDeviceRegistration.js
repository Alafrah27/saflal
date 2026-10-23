import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../convex/_generated/api";
import { useContextProvider } from "../context/LngContext";
import { useAuthSession } from "../context/AuthSessionContext";

export const INSTALLATION_KEY = "saflal_installation_id";
export const REGISTRATION_VERSION_KEY = "saflal_registration_version";

export async function getOrCreateInstallationId() {
  try {
    let id = await AsyncStorage.getItem(INSTALLATION_KEY);
    if (!id || !/^[a-zA-Z0-9_-]{16,128}$/.test(id)) {
      if (typeof Crypto.randomUUID === "function") {
        id = Crypto.randomUUID();
      }
      if (!id || !/^[a-zA-Z0-9_-]{16,128}$/.test(id)) {
        id = `install_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      }
      await AsyncStorage.setItem(INSTALLATION_KEY, id);
    }
    return id;
  } catch {
    return `install_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function useDeviceRegistration() {
  const { ready, profile } = useAuthSession();
  const { expoPushToken } = useContextProvider();
  const { i18n } = useTranslation();
  const registerDevice = useMutation(api.devices.registerDevice);
  const registeredRef = useRef("");

  useEffect(() => {
    if (!ready || !profile?._id || !expoPushToken) return;

    // Validate token format before calling mutation
    if (!/^(ExpoPushToken|ExponentPushToken)\[[a-zA-Z0-9_-]{1,200}\]$/.test(expoPushToken)) {
      return;
    }

    const language = i18n?.language === "ar" ? "ar" : "en";
    const platform = Platform.OS === "ios" ? "ios" : "android";
    const registrationKey = `${profile._id}:${expoPushToken}:${platform}:${language}`;

    if (registeredRef.current === registrationKey) return;

    let active = true;

    async function syncDevice() {
      const installationId = await getOrCreateInstallationId();
      if (!active || !installationId) return;

      try {
        const result = await registerDevice({
          expoPushToken,
          installationId,
          platform,
          language,
        });
        if (active) {
          registeredRef.current = registrationKey;
          if (result?.registrationVersion !== undefined) {
            await AsyncStorage.setItem(REGISTRATION_VERSION_KEY, String(result.registrationVersion));
          }
          console.log("[PushNotifications] Device successfully registered in Convex:", {
            deviceId: result?.deviceId,
            expoPushToken,
            platform,
            language,
          });
        }
      } catch (err) {
        console.warn("[PushNotifications] Failed to register device in Convex:", err?.message || err);
      }
    }

    void syncDevice();

    return () => {
      active = false;
    };
  }, [ready, profile?._id, expoPushToken, i18n?.language, registerDevice]);
}
