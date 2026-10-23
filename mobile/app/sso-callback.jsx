import { Redirect } from "expo-router";
import { useAuthSession } from "../context/AuthSessionContext";
import AppSplashScreen from "../components/AppSplashScreen";

export default function SsoCallback() {
  const { ready, state } = useAuthSession();

  if (ready) {
    return <Redirect href="/(tabs)/chat" />;
  }

  if (state === "signed-out" || state === "convex-error" || state === "cache-error") {
    return <Redirect href="/(auth)/login" />;
  }

  return <AppSplashScreen />;
}
