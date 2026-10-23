import { Redirect } from "expo-router";
import { useAuthSession } from "../../context/AuthSessionContext";
import AppSplashScreen from "../../components/AppSplashScreen";

export default function AuthIndex() {
  const { state } = useAuthSession();
  if (state === "ready") return <Redirect href="/(tabs)/chat" />;
  if (state !== "loading" && state !== "profile") return <Redirect href="/(auth)/wellcome" />;
  return <AppSplashScreen />;
}
