import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LngProvider } from "../context/LngContext";
import "../lib/i18";
import { useEffect } from "react";
import { View, Text } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import ErrorBoundary from "../components/ErrorBoundary";
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as SplashScreen from "expo-splash-screen";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { AuthSessionProvider, useAuthSession } from "../context/AuthSessionContext";
import AppSplashScreen from "../components/AppSplashScreen";
import CallProvider from "../components/calls/CallProvider";
import { useDeviceRegistration } from "../hooks/useDeviceRegistration";
import "../global.css";

// Prevent the splash screen from auto-hiding before asset loading and auth check are complete.
void SplashScreen.preventAutoHideAsync().catch(() => {});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false,
  }),
});

function Navigation() {
  const { ready, state, profile } = useAuthSession();
  const notificationsEnabled = ready && profile?.notificationsEnabled !== false;
  useEffect(() => {
    Notifications.setNotificationHandler({ handleNotification: async () => ({
      shouldShowBanner: notificationsEnabled, shouldShowList: notificationsEnabled,
      shouldPlaySound: notificationsEnabled, shouldSetBadge: false,
    }) });
    return () => Notifications.setNotificationHandler(null);
  }, [notificationsEnabled]);
  useDeviceRegistration();
  useEffect(() => {
    if (state !== "loading" && state !== "profile") {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [state]);

  if (state === "loading" || state === "profile") {
    return <AppSplashScreen />;
  }

  return <>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Protected guard={!ready}><Stack.Screen name="(auth)" options={{ animation: "fade" }} /></Stack.Protected>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="settings" options={{ animation: "fade" }} />
        <Stack.Screen name="blocked-users" options={{ animation: "fade" }} />
        <Stack.Screen name="chat" options={{ animation: "fade" }} />
        <Stack.Screen name="call" options={{ animation: "fade" }} />
        <Stack.Screen name="search" options={{ animation: "fade" }} />
        <Stack.Screen name="imageView" options={{ animation: "fade" }} />
      </Stack.Protected>
      <Stack.Screen name="sso-callback" options={{ animation: "fade" }} />
      <Stack.Screen name="+not-found" options={{ animation: "fade" }} />
    </Stack>
  </>;
}

export default function RootLayout() {
  if (!publishableKey || !convex) return <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
    <Text>Set the Clerk publishable key and Convex URL before starting Saflal.</Text>
  </View>;
  return <ErrorBoundary>
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <AuthSessionProvider>
              <KeyboardProvider>
                <LngProvider>
                  <BottomSheetModalProvider><CallProvider><Navigation /></CallProvider></BottomSheetModalProvider>
                </LngProvider>
              </KeyboardProvider>
            </AuthSessionProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </ErrorBoundary>;
}
