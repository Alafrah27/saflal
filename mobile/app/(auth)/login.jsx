import { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSSO } from "@clerk/expo";
import { makeRedirectUri } from "expo-auth-session";
import AuthScreen from "../../components/auth/AuthScreen";
import { AuthButton, AuthError } from "../../components/auth/AuthControls";
import { useAuthText } from "../../components/auth/authText";

export default function Login() {
  const text = useAuthText();
  const { startSSOFlow } = useSSO();
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  async function start(strategy) {
    setPending(strategy); setError("");
    try {
      const result = await startSSOFlow({
        strategy, redirectUrl: makeRedirectUri({ scheme: "mobile", path: "sso-callback" }),
      });
      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
      } else if (result.signUp?.status === "missing_requirements") {
        setError("Your Clerk account requires additional information. Contact support to complete sign-in.");
      }
    } catch (failure) {
      if (!["ERR_REQUEST_CANCELED", "SIGN_IN_CANCELLED"].includes(failure.code)) {
        setError("Sign-in could not finish. Please try again.");
      }
    } finally { setPending(null); }
  }
  return <AuthScreen title={text("Welcome to Saflal")} subtitle={text("Sign in or create your account to continue.")}
    footer={<>
      <AuthError message={error} />
      <AuthButton title={text("Sign in with Google")} icon={<Ionicons name="logo-google" size={22} color="#111827" accessible={false} />}
        disabled={!!pending} busy={pending === "oauth_google"} onPress={() => start("oauth_google")} />
      <AuthButton title={text("Sign in with Apple")} icon={<Ionicons name="logo-apple" size={22} color="#111827" accessible={false} />}
        disabled={!!pending} busy={pending === "oauth_apple"} onPress={() => start("oauth_apple")} />
      <View nativeID="clerk-captcha" />
    </>} />;
}
